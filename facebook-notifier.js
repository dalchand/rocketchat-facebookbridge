RocketChat.callbacks.add('afterSaveMessage', function(message, room) {

  	if(room && room.t === 'l' && room.v._id !== message.u._id) {

      	console.log('notify', message);

    	var user = Meteor.users.findOne({_id: room.v._id, type: 'visiter', visiter_type: 'facebook' });
    	if(user) {
        RocketChat.FacebookBridge.sendMessage(user, message);
    	}
  	}

  	return message;

}, RocketChat.callbacks.priority.LOW, 'notifyFacebookUserOnMessage');