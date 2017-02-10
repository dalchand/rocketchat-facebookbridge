Package.describe({
  name: 'dc4ual:rocketchat-facebookbridge',
  version: '0.0.1',
  // Brief, one-line summary of the package.
  summary: 'A simple package for linking facebook messenger to rocketchat',
  // URL to the Git repository containing the source code for this package.
  git: 'https://github.com/dalchand/rocketchat-facebookbridge.git',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function(api) {

  api.use('ecmascript');
  api.use('mongo');
  api.use('http');
  api.use('webapp');

  api.use('dc4ual:rocketchat-external-file-access');
  
  api.use('rocketchat:lib');
  api.use('rocketchat:livechat');

  api.addFiles([
    'settings.js',
    'facebook-guest.js',
    'facebook-bridge.js',
    'facebook-notifier.js'
  ],'server');

});

Npm.depends({
  "raw-body": "2.2.0"
});
