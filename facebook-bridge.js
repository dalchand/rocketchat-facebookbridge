import { FacebookGuest } from './facebook-guest.js';

const crypto = Npm.require('crypto');
const url = Npm.require('url');
const getRawBody = Npm.require('raw-body');

const getRawRequestBody = Meteor.wrapAsync(function(req, callback) {
  getRawBody(req, function (err, buf) {
    if (err) {
      callback(err)
    }
    else {
      callback(null, buf.toString('utf-8'));
    }
  });
});

const registerHandler = function(path, callback) {

	WebApp.rawConnectHandlers.use('/' + path, Meteor.bindEnvironment(callback));

}

class FacebookBridge {
	constructor() {

		this.apiSecret = RocketChat.settings.get('FacebookBridge_AppSecret');
		this.validationToken = RocketChat.settings.get('FacebookBridge_ValidationToken');
		this.pageToken = RocketChat.settings.get('FacebookBridge_PageToken');
		this.enabled = RocketChat.settings.get('FacebookBridge_Enabled');
		
		this.pathPrefix = '_fb_bridge_';
		this.apiPath = 'https://graph.facebook.com/v2.6';

		RocketChat.settings.get('FacebookBridge_AppSecret', (key, value) => {
			if(value !== this.apiSecret) {
				this.apiSecret = value;
			}
		});

		RocketChat.settings.get('FacebookBridge_ValidationToken', (key, value) => {
			if(value !== this.validationToken) {
				this.validationToken = value;
			}
		});

		RocketChat.settings.get('FacebookBridge_PageToken', (key, value) => {
			if(value !== this.pageToken) {
				this.pageToken = value;
			}
		});	

		RocketChat.settings.get('FacebookBridge_Enabled', (key, value) => {
			if(value !== this.enabled) {
				this.enabled = value;
			}
		})

		this.registerHandlers();

	}

	getResourceUrl(url) {
		var result = url.split('/');
		if(result[2]) {
			var fileId = result[2];
			var externalPath = ExternalFileAccess.getFileAccessPath(fileId);
			var fileUrl = Meteor.absoluteUrl(externalPath, {
				rootUrl: process.env.ROOT_URL
			});
			return fileUrl;
		}
	}

	verifyRequestSignature(req, res, payload) {
		
		var signature = req.headers["x-hub-signature"];

	  	if (!signature) {
	    	// For testing, let's log an error. In production, you should throw an
	    	// error.
	    	throw new Error("Couldn't validate the signature.");

	  	} else {
	    	var elements = signature.split('=');
	    	var method = elements[0];
	    	var signatureHash = elements[1];

	    	// var expectedHash = CryptoJS.HmacSHA1(payload, APP_SECRET).toString();

	    	var expectedHash = crypto.createHmac('sha1', this.apiSecret)
	                        		.update(payload)
	                        		.digest('hex');

	    	if (signatureHash != expectedHash) {
	      		throw new Meteor.Error("Couldn't validate the request signature.");
	    	}

	  	}
	}

	getWebhookUrl(path) {
		return this.pathPrefix + '/' + path;
	}

	getGraphApiUserUrl(id) {
		return this.apiPath + '/' + id;
	}

	getGraphApiMessageUrl() {
		return this.apiPath + '/me/messages';
	}

	registerHandlers() {

	
		// Root connect handler for verifying request signature
		
		registerHandler(this.pathPrefix, (req, res, next) => {
			if(!this.enabled) {
				res.statusCode = 500;
				res.end();
			} else {
				var body = getRawRequestBody(req);

				try {
			  		if(body) {
						this.verifyRequestSignature(req, res, body);
						req.body = JSON.parse(body);
			    	}
			  		next();
			  	} catch(e) {
			  		console.error('Error in facebook bridge:', e);
			  		res.statusCode = 500;
			  		res.end();
			  	}
		  	}
		});


		//	Webhook for reading facebook messages 	 

		registerHandler(this.getWebhookUrl('webhook'), (req, res, next) => {
			
			var parsedUrl = url.parse(req.url, true);
		  	var reqMethod = req.method.toLowerCase();

		  	var self = this;

			if(reqMethod == 'get') {
				if (parsedUrl.query['hub.mode'] === 'subscribe' && parsedUrl.query['hub.verify_token'] === this.validationToken) {
			      	console.log("Validating webhook");
			      	res.statusCode = 200;
			      	res.write(parsedUrl.query['hub.challenge']);
			      	res.end();
			    } else {
			      	console.error("Failed validation. Make sure the validation tokens match.");
			      	res.statusCode = 403;
			      	res.end();
			    }
			} else if(reqMethod == 'post'){

				var data = req.body;
		  		// console.log(data);
		  		// Make sure this is a page subscription
		  		if (data.object == 'page') {
		    		// Iterate over each entry
		    		// There may be multiple if batched
		    		data.entry.forEach(function(pageEntry) {
		     	 		var pageID = pageEntry.id;
		      			var timeOfEvent = pageEntry.time;
		      			// Iterate over each messaging event
		      			pageEntry.messaging.forEach(function(messagingEvent) {
		        			if (messagingEvent.message) {
		          				self.onFacebookMessage(messagingEvent);
		        			} else {
		          				console.log("Webhook received unknown messagingEvent: ", messagingEvent);
		        			}
		      			});
		    		});

				    // Assume all went well.
				    //
				    // You must send back a 200, within 20 seconds, to let us know you've
				    // successfully received the callback. Otherwise, the request will time out.
				    res.statusCode = 200;
				    res.end();
		  		}

			} else {
			    next();
			}
		});

		// WebApp.rawConnectHandlers.use('/' + this.getWebhookUrl('webhook'), );

	}

	getFacebookUserDetails(senderId) {
		var url = this.getGraphApiUserUrl(senderId);
		var response = HTTP.get(url, {
		    params: {
		      	access_token: this.pageToken
		    }
		});

		if(response) {
		    return response.data;
		}
	}

	onFacebookMessage(event) {

		// console.log('Recieved facebook message:', JSON.stringify(event));

	  	var senderId = event.sender.id;
	  	var recipientID = event.recipient.id;
	  	var timeOfMessage = event.timestamp;
	  	var message = event.message;

	  	var userId;

	  	if(!FacebookGuest.hasGuest(senderId)) {

	  		var userDetails = this.getFacebookUserDetails(senderId);
	  		FacebookGuest.createGuest(senderId, userDetails);

	  	}

	  	var guest = FacebookGuest.findGuestBySenderId(senderId);

	  	var room = RocketChat.models.Rooms.findOneOpenByVisitorId(guest._id);

	  	var msgObject = {
	    	_id: Random.id(),
	    	msg: message.text,
	    	token: senderId
	  	}

	  	if(room) {
	    	msgObject.rid = room._id;
	  	} else {
	    	msgObject.rid = Random.id();
	  	}


	  	var attachments = [];
	  	if(event.message.attachments) {
	  		
	  		event.message.attachments.forEach(function(item) {
	  			if(item.type === 'image') {
	  				attachments.push({
	  					image_url: item.payload.url
	  				});
	  			} else if(item.type === 'location') {
	  				msgObject.location = {
	  					type: 'Point',
	  					coordinates: [ item.payload.coordinates.long, item.payload.coordinates.lat ]
	  				}
	  			}
	  		});
	  	}

	  	if(attachments.length > 0) {
	  		msgObject.attachments = attachments;
	  	}

	  	var result = RocketChat.Livechat.sendMessage({ guest: guest, message: msgObject });

	}

	sendMessage(user, message) {
		var senderId;
		if(user && user.profile && user.profile.facebook && user.profile.facebook.senderId) {
			senderId = user.profile.facebook.senderId;
		}
		if(!senderId) {
			return;
		}

		var text = message.msg;
		var attachments = message.attachments;

		if(text) {
			this.sendTextMessage(senderId, text);
		} else if(attachments) {
			attachments.forEach((item) => {
				if(item.image_url) {
					this.sendImageMessage(senderId, item.image_url);
				}
			});
		}
		
	}

	sendTextMessage(recipientId, text) {
		var messageData = {
	    	recipient: {
	      		id: recipientId
	    	},
	    	message: {
	    		text: text
	    	}
  		};
  		this.callSendAPI(messageData);
	}

	sendImageMessage(recipientId, imageUrl) {
		var messageData = {
	    	recipient: {
	      		id: recipientId
	    	},
	    	message: {
	    		attachment: {
	    			type: 'image',
		    		payload: {
		    			url: this.getResourceUrl(imageUrl)
		    		}
		    	}	
		    }
  		};
  		this.callSendAPI(messageData);
	}

	callSendAPI(messageData) {
		console.log('Sending facebook message:', messageData);
		var url = this.getGraphApiMessageUrl();
		HTTP.post(url, {
			params: { access_token: this.pageToken },
			data: messageData
		}, function(error, result) {
			if(error) {
				console.error(error);
			}
		});
	}

}

RocketChat.FacebookBridge = new FacebookBridge();
