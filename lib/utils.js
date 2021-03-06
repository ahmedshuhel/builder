var path = require('path');
var url = require('url');

function fromFileURL(url) {
  return url.substr(7 + !!process.platform.match(/^win/)).replace(/\//g, path.sep);
}
exports.fromFileURL = fromFileURL;

function toFileURL(path) {
  return 'file://' + (process.platform.match(/^win/) ? '/' : '') + path.replace(/\\/g, '/');
}
exports.toFileURL = toFileURL;

function isFileURL(url) {
  return url.substr(0, 5) === 'file:';
}
exports.isFileURL = isFileURL;

/* Remove scheme prefix from file URLs, so that they are paths. */
function filePath(url) {
  if (isFileURL(url))
    return url.replace(/^file:\/+/, '/');
}
exports.filePath = filePath;

/* Coerce URLs to paths, assuming they are file URLs */
function coercePath(url) {
  if (isFileURL(url))
    return url.replace(/^file:\/+/, '/');
  else
    // assume relative
    return path.resolve(process.cwd(), url);
}
exports.coercePath = coercePath;

var absURLRegEx = /^[^\/]+:\/\//;

exports.getCanonicalName = getCanonicalName;
function getCanonicalName(loader, normalized) {
  // remove the plugin part first
  var pluginIndex = normalized.indexOf('!');
  var plugin;
  if (pluginIndex != -1) {
    plugin = normalized.substr(pluginIndex + 1);
    normalized = normalized.substr(0, pluginIndex);
  }

  // now just reverse apply paths rules to get canonical name
  var pathMatch, pathMatchLength = 0;
  var curMatchlength;
  for (var p in loader.paths) {
    // normalize the output path
    var curPath
    if (loader.paths[p][0] == '.')
      curPath = decodeURI(url.resolve(toFileURL(process.cwd()) + '/', loader.paths[p]));
    else
      curPath = decodeURI(url.resolve(loader.baseURL, loader.paths[p]));

    // do reverse match
    var wIndex = curPath.indexOf('*');
    if (wIndex === -1) {
      if (normalized === curPath) {
        curMatchLength = curPath.split('/').length;
        if (curMatchLength > pathMatchLength) {
          pathMatch = p;
          pathMatchLength = curMatchLength;
        }
      }
    }
    else {
      if (normalized.substr(0, wIndex) === curPath.substr(0, wIndex)
        && normalized.substr(normalized.length - curPath.length + wIndex + 1) === curPath.substr(wIndex + 1)) {
        curMatchLength = curPath.split('/').length;
        if (curMatchLength > pathMatchLength) {
          pathMatch = p.replace('*', normalized.substr(wIndex, normalized.length - curPath.length + 1));
          pathMatchLength = curMatchLength;
        }
      }
    }
  }

  // when no path was matched, act like the standard rule is *: baseURL/*
  if (!pathMatch) {
    if (normalized.substr(0, loader.baseURL.length) == loader.baseURL)
      pathMatch = normalized.substr(loader.baseURL.length);
    else if (normalized.match(absURLRegEx))
      throw 'Unable to calculate canonical name to bundle ' + normalized;
    else
      pathMatch = normalized;
  }

  if (plugin)
    pathMatch += '!' + getCanonicalName(loader, plugin);

  return pathMatch;
}