const path = require('path');

/** @type {import('md-to-pdf/dist/lib/config').Configuration} */
module.exports = {
  // Absolute path — md-to-pdf resolves stylesheets from process.cwd(), not basedir.
  stylesheet: [path.join(__dirname, 'guide-print.css')],
  body_class: ['user-guide'],
  pdf_options: {
    format: 'A4',
    printBackground: true,
    margin: {
      top: '12mm',
      right: '12mm',
      bottom: '14mm',
      left: '12mm',
    },
  },
  basedir: __dirname,
};
