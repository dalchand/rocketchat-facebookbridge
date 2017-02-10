Meteor.startup(function() {
	RocketChat.settings.addGroup('FacebookBridge', function() {
		this.add('FacebookBridge_Enabled', false, {
			type: 'boolean',
			i18nLabel: 'Enabled',
			public: true
		});

		this.add('FacebookBridge_AppSecret', '', {
			type: 'string',
			enableQuery: {
				_id: 'FacebookBridge_Enabled',
				value: true
			},
			i18nLabel: 'App_Secret'
		});

		this.add('FacebookBridge_ValidationToken', '', {
			type: 'string',
			enableQuery: {
				_id: 'FacebookBridge_Enabled',
				value: true
			},
			i18nLabel: 'Validation_Token'
		});

		this.add('FacebookBridge_PageToken', '', {
			type: 'string',
			enableQuery: {
				_id: 'FacebookBridge_Enabled',
				value: true
			},
			i18nLabel: 'Page_Token'
		});
	});
});