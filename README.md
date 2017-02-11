# Rocketchat FacebookBridge

This package allows facebook messenger to be integrated with rocketchat. It's an early stage package and currently only support text, image and location messages.

## Getting Started

In order to use this package, first make yourself familiar with facebook messenger app.

### Prerequisites

This package uses [rocketchat-external-file-access](https://github.com/dalchand/rocketchat-external-file-access).

### Installing


Add this package along with [rocketchat-external-file-access](https://github.com/dalchand/rocketchat-external-file-access) to your rocketchat. You can create a simlink to packages folder

```
ln -s /path/to/this-package /path/to/Rocket.Chat/packages/rocketchat-facebookbridge
```

Also do the same for [rocketchat-external-file-access](https://github.com/dalchand/rocketchat-external-file-access)

Add package to rocket chat app

```
meteor add dc4ual:rocketchat-facebookbridge
```

### Make it work

You need to do following things in order to make it work with your facebook messenger app.

1. Login to Rocket chat admin panel and enable Livechat
2. Go to FacebookBridge settings. You can search settings or directly go to ```/admin/FacebookBrdge```. Enable FacebookBridge and fill in Page Token, App secret and a random validation token.
3. In your messenger app add webhook url as ```<rocket-chat-app-url>/_fb_bridge_/webhook``` and use same validation token and save.
4. You have to create at least one department with at least one agent.
5. Enjoy...

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details
