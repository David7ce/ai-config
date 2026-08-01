'use strict';

function diagnostic(severity, code, message, file = null, field = null) {
  return { severity, code, message, file, field };
}

function error(code, message, file = null, field = null) {
  return diagnostic('error', code, message, file, field);
}

function warning(code, message, file = null, field = null) {
  return diagnostic('warning', code, message, file, field);
}

function hasErrors(diagnostics) {
  return diagnostics.some((item) => item.severity === 'error');
}

module.exports = { diagnostic, error, warning, hasErrors };