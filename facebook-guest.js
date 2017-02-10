const Counters = new Mongo.Collection("facebook-guest-counters");

Counters._ensureIndex("key", { unique: true });

const nextValue = Meteor.wrapAsync(function(key, callback){
	Counters.rawCollection().findAndModify(
    { key: key },
    [],
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
    function(err,doc) {
    	if(doc) {
    		if(doc.ok) {
    			callback(null, doc.value.seq);
    		}
    	} else {
    		callback(err, null);
    	}
    }
	);
});

const getNextGuestUsername = function() {
	var value = nextValue('username');
	if(typeof value === 'number') {
		return 'fb-guest-' + value;
	} else {
		console.error('could not generate guest id');
    throw new Meteor.Error("Unable to generate facebook guest id");
  }
}

const hasGuest = function(senderId) {
    return !! Meteor.users.findOne({ 'profile.facebook.senderId': senderId, type: 'visiter', visiter_type: 'facebook' });
}

const findGuestBySenderId = function(senderId) {

    return Meteor.users.findOne({ 'profile.facebook.senderId': senderId, type: 'visiter', visiter_type: 'facebook' }, {
        fields: {
            name: 1,
            username: 1,
            department: 1
        }
    });
}

const createGuest = function(senderId, details) {
    
    var userData = {
        profile: {
            facebook: {
                senderId: senderId
            }
        },
        type: 'visiter',
        visiter_type: 'facebook',
        globalRoles: ['livechat-guest'],
        joinDefaultChannels: false,
        name: 'Facebook User',
        username: getNextGuestUsername()
    };

    if(details) {
      userData.profile.facebook.details = details;
      if(details.first_name) {
        userData.name = details.first_name;
        if(details.last_name) {
          userData.name += ( ' ' + details.last_name);
        }
      }
    }

    var userId = Accounts.insertUserDoc({}, userData);
    if(userId && details.profile_pic) {
      userData._id = userId;
      RocketChat.setUserAvatar(userData, details.profile_pic, null, 'url');
    }

}

export const FacebookGuest = Object.freeze({
    hasGuest: hasGuest,
    createGuest: createGuest,
    findGuestBySenderId: findGuestBySenderId
});
