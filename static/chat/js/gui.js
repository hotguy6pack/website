(function($){
	
	destiny.fn.Chat = function(engine, options){
		$.extend(this, options);
		this.ui = $(this.ui);
		this.engine = engine;
		return this.init();
	};
	$.extend(destiny.fn.Chat.prototype, {

		theme: 'dark',
		maxlines: 50,
		lineCount: 0,
		scrollPlugin: null,
		ui: null,
		lines: null,
		output: null,
		input: null,
		onSend: $.noop,
		userMessages: [],
		backlog: backlog,
		hilightregex: {},
		notifications: true,
		
		init: function(){
			// Set the elements data 'chat' var - should prob remove this - used to reference this in the UI
			this.ui.data('chat', this);
			
			// local elements stored in vars to not have to get the elements via query each time
			this.lines = $(this.ui.find('.chat-lines:first')[0]);
			this.output = $(this.ui.find('.chat-output:first')[0]);
			this.inputwrap = $(this.ui.find('.chat-input:first')[0]);
			this.input = $(this.inputwrap.find('.input:first:first')[0]);
			
			// Scrollbars and scroll locking
			if(this.scrollPlugin == null){
				//this.scrollPlugin = new destiny.fn.ChatScrollPlugin(this);
				this.scrollPlugin = new destiny.fn.mCustomScrollbarPlugin(this);
				this.scrollPlugin.lockScroll(true);
			};
			
			// Input history
			this.currenthistoryline = -1;
			this.storedinputline = null;
			if (window.localStorage) {
				this.setupInputHistory();
			}

			this.setupNotifications();
			if(this.engine.user.username){
				this.hilightregex.user = new RegExp("\\b"+this.engine.user.username+"\\b", "i");
			};

			// Bind to user input submit
			this.ui.on('submit', 'form.chat-input', function(e){
				e.preventDefault();
				$(this).closest('.chat.chat-frame').data('chat').send();
			});
			
			// Generic menus functions
			this.menus = [];
			this.menuOpenCount = 0;
			this.menu = function(){
				return this;
			};
			this.menu.addMenu = function(chat, e){
				e.on('click', 'button.close', function(){
					chat.menu.closeMenus(chat);
				});
				chat.menu.prototype.scrollable.apply(e);
				chat.menus.push(e);
				return this;
			};
			this.menu.update = function(chat){
				if(chat.menuOpenCount > 0){
					chat.ui.addClass('active-menu');
				}else{
					chat.ui.removeClass('active-menu');
				}
			};
			this.menu.closeMenus = function(chat){
				for(var i=0;i<chat.menus.length; ++i){
					if(chat.menus[i].visible){
						this.prototype.hideMenu.call(chat.menus[i], chat);
					}
				}
			};
			this.menu.prototype.showMenu = function(chat){
				this.stop().slideDown(50);
				this.visible = true;
				this.btn.addClass('active');
				++chat.menuOpenCount;
				chat.menu.update(chat);
			};
			this.menu.prototype.hideMenu = function(chat){
				this.stop().hide();
				this.visible = false;
				this.btn.removeClass('active');
				--chat.menuOpenCount;
				chat.menu.update(chat);
			};
			this.menu.prototype.scrollable = function(){
				this.scrollable.mCustomScrollbar({
					theme: 'light-thin',
					scrollInertia: 0,
					horizontalScroll: false,
					autoHideScrollbar: true,
					scrollButtons:{enable:false},
					callbacks: {onTotalScrollOffset: 1,onTotalScrollBackOffset: 1}
				});
			};
			this.menu.prototype.clickAway = function(){
				var chat = $(this).closest('.chat').data('chat');
				if(chat.menuOpenCount > 0){
					chat.menu.closeMenus(chat);
				}
			};
			
			this.output.on('click', this.menu.prototype.clickAway);
			this.input.on('click', this.menu.prototype.clickAway);
			//
			
			// Chat settings
			this.chatsettings = this.ui.find('#chat-settings:first').eq(0);
			this.chatsettings.btn = this.ui.find('.chat-settings-btn:first').eq(0);
			this.chatsettings.list = this.chatsettings.find('ul:first').eq(0);
			this.chatsettings.visible = false;
			this.chatsettings.scrollable = this.chatsettings.find('.scrollable:first');
			this.loadSettings();
			
			this.chatsettings.btn.on('click', function(e){
				e.preventDefault();
				var chat = $(this).closest('.chat.chat-frame').data('chat');
				chat.chatsettings.detach();
				if(chat.chatsettings.visible){
					return chat.menu.prototype.hideMenu.call(chat.chatsettings, chat);
				}
				chat.menu.closeMenus(chat);
				chat.chatsettings.appendTo(chat.ui);
				return chat.menu.prototype.showMenu.call(chat.chatsettings, chat);
			});
			this.chatsettings.on('change', 'input[type="checkbox"]', function(){
				var chat    = $(this).closest('.chat.chat-frame').data('chat'),
				    name    = $(this).attr('name'),
				    checked = $(this).is(':checked');
				switch(name){
				
					case 'showtime':
						if(checked)
							chat.ui.addClass('chat-time');
						else
							chat.ui.removeClass('chat-time');
						chat.resize();
						break;
						
					case 'showicon':
						
						chat.saveChatOption(name, checked);
						if(checked)
							chat.ui.addClass('chat-icons');
						else
							chat.ui.removeClass('chat-icons');
						chat.resize();
						break;
						
					case 'notifications':
						var permission = notifications.checkPermission();
						if (permission == 1) // not yet allowed
							notifications.requestPermission(function(){});
						else if (permission == 2) {
							chat.notifications = false;
							break;
						}
						
						chat.notifications = checked;
						chat.saveChatOption(name, checked);
						break;
				}
				chat = null;
			});
			
			// User list
			this.userslist = this.ui.find('#chat-user-list:first').eq(0);
			this.userslist.btn = this.ui.find('.chat-users-btn:first').eq(0);
			this.userslist.list = this.userslist.find('ul:first').eq(0);
			this.userslist.visible = false;
			this.userslist.scrollable = this.userslist.find('.scrollable:first');
			this.userslist.btn.on('click', function(e){
				e.preventDefault();
				var chat = $(this).closest('.chat.chat-frame').data('chat');
				chat.userslist.detach();
				if(chat.userslist.visible){
					return chat.menu.prototype.hideMenu.call(chat.userslist, chat);
				}
				chat.menu.closeMenus(chat);
				chat.userslist.list.empty();
				if(chat.engine.user)
					chat.userslist.list.append($('<li><a class="'+ chat.engine.user.features.join(' ') +'">'+chat.engine.user.username+'</a></li>'));
				for(var i=0; i<chat.engine.users.length; ++i)
					chat.userslist.list.append($('<li><a class="'+ chat.engine.users[i].features.join(' ') +'">'+chat.engine.users[i].username+'</a></li>'));
				chat.userslist.appendTo(chat.ui);
				return chat.menu.prototype.showMenu.call(chat.userslist, chat);
			});
			
			this.menu.addMenu(this, this.chatsettings);
			this.menu.addMenu(this, this.userslist);
			
			// Enable toolbar
			this.ui.find('.chat-tools-wrap button').removeAttr('disabled');
			return this.resize();
		},
		
		loadSettings: function() {
			var self     = this,
			    defaults = {
				showtime     : false,
				showicon     : false,
				notifications: false,
			};
			
			this.chatsettings.find('input[type="checkbox"]').each(function() {
				var name  = $(this).attr('name'),
				    value = self.getChatOption(name, defaults[name]);
				
				$(this).attr('checked', value);
			});
		},
		
		loadBacklog: function() {
			if(this.backlog.length > 0){
				for (var i = this.backlog.length - 1; i >= 0; i--) {
					var line    = this.backlog[i],
					    message = this.engine.dispatchBacklog(line);
					
					if (!message)
						continue;
					
					if ($.inArray(line.event, this.engine.controlevents) >= 0)
						this.put(message, 'control');
					else {
						var m = this.put(message);
						this.handleHilight(m, true);
					}
				}
				this.put(new ChatUIMessage('<hr/>'));
			};
		},
		
		lineCount: function(){
			return this.lines.children().length;
		},
		
		// API
		purge: function(){
			this.lines.empty();
			return this;
		},
		pushControlMessage: function(message) {
			var m = this.push(message);
			m.ui.addClass('control');
		},
		push: function(message, state){
			var isScrolledBottom = this.scrollPlugin.isScrolledBottom();
			this.userMessages.push(message);
			this.put(message, state);
			this.scrollPlugin.update();
			if(this.lineCount() >= this.maxlines){
				this.lines.children().eq(0).remove();
			}
			if(isScrolledBottom && this.scrollPlugin.isScrollLocked()){
				this.scrollPlugin.scrollBottom();
			}
			this.handleHilight(message);
			return message;
		},
		
		lastMessage: null,
		
		// bypass ui updates and notifications
		// used to mass put history messages, and only update ui afterwards
		put: function(message, state, klass){
			if(message instanceof ChatUserMessage){
				if(this.lastMessage && this.lastMessage.user && message.user && this.lastMessage.user.username == message.user.username){
					//same person
					message.ui = $(message.addonHtml());
				}else{
					//different person
					message.ui = $(message.html());
				}
			}else{
				message.ui = $(message.html());
			};
			message.ui.appendTo(this.lines);
			if (klass)
				message.ui.addClass(klass);
			
			if(state != undefined)
				message.status(state);
			this.lastMessage = message;
			return message;
		},
		
		send: function(){
			var str = this.input.val();
			if(str != ''){
				this.input.val('').focus();
				this.onSend(str, this.input[0]);
				this.insertInputHistory(str);
				this.currenthistoryline = -1;
			};
			str = null;
			return this;
		},
		
		resize: function(){
			this.output.height(this.ui.height()-(this.inputwrap.height() + parseInt(this.inputwrap.css('margin-top'))));
			this.scrollPlugin.update();
			this.scrollPlugin.scrollBottom();
			return this;
		},
		
		enableInput: function(){
			this.input.removeAttr('disabled', true);
		},
		
		disableInput: function(){
			this.input.attr('disabled', true);
		},
		
		setupInputHistory: function(){
			$(this.input).on('keyup', function(e) {
				
				if (e.keyCode != 38 && e.keyCode != 40)
					return;
				
				var self = $(this).closest('.chat.chat-frame').data('chat'),
				    num  = e.keyCode == 38? -1: 1; // if uparrow we subtract otherwise add
				
				// if uparrow and we are not currently showing any lines from the history
				if (self.currenthistoryline < 0 && e.keyCode == 38) {
					// set the current line to the end if the history, do not subtract 1
					// thats done later
					self.currenthistoryline = self.getInputHistory().length;
					// store the typed in message so that we can go back to it
					self.storedinputline = $(self.input).val();
					
					if (self.currenthistoryline <= 0) // nothing in the history, bail out
						return;
					
				} else if (self.currenthistoryline < 0 && e.keyCode == 40)
					return; // down arrow, but nothing to show
				
				var index = self.currenthistoryline + num;
				// out of bounds
				if (index >= self.getInputHistory().length || index < 0) {
					
					// down arrow was pressed to get back to the original line, reset
					if (index >= self.getInputHistory().length) {
						$(self.input).val(self.storedinputline);
						self.currenthistoryline = -1;
					}
					
					return;
				}
				
				self.currenthistoryline = index;
				$(self.input).val(self.getInputHistory()[index]);
				
			});
		},
		
		getInputHistory: function(){
			return JSON.parse(localStorage['inputhistory'] || '[]');
		},
		
		setInputHistory: function(arr){
			localStorage['inputhistory'] = JSON.stringify(arr);
		},
		
		insertInputHistory: function(message){
			if (!window.localStorage)
				return;
			
			var history = this.getInputHistory();
			history.push(message);
			if (history.length > 20)
				history.shift();
			
			this.setInputHistory(history);
		},
		
		resolveMessage: function(data){
			var found = false;
			for(var i in this.userMessages){
				if(this.userMessages[i].message == data.data){
					this.userMessages[i].status();
					this.userMessages[i] = null;
					delete(this.userMessages[i]);
					found = true;
				}
			}
			return found;
		},
		
		setupNotifications: function() {
			window.notifications = window.webkitNotifications || window.mozNotifications || window.oNotifications || window.msNotifications || window.notifications;
			if(!notifications || !this.engine.user.username || !this.getChatOption('notifications', false)){
				this.notifications = false;
			}
		},
		
		showNotification: function(message) {
			var msg = message.message, title = (message.user) ? ''+message.user.username+' said ...' : 'Highlight ...';
			if (msg.length >= 30)
				msg = msg.substring(0, 30) + '...';

			var notif = notifications.createNotification(destiny.cdn+'/chat/img/notifyicon.png', title, msg);
			
			// only ever show a single notification
			if (this.currentnotification)
				this.currentnotification.cancel();
			
			this.currentnotification = notif;
			notif.show();
			var self = this;
			setTimeout(function() {
				notif.cancel();
				self.currentnotification = null;
				self = null;
			}, 5000);
		},
		
		handleHilight: function(message, skipnotify){
			if (!this.hilightregex.user || !this.getChatOption('hilight', true))
				return;
			if (message.user && message.user.username != this.engine.user.username && this.hilightregex.user.test(message.message)) {
				message.ui.addClass('hilight');
				if(!skipnotify && this.notifications){
					this.showNotification(message);
				}
			}
		},
		
		getChatOption: function(option, defaultvalue) {
			var options = JSON.parse(localStorage['chatoptions'] || '{}');
			return (options[option] == undefined)? defaultvalue: options[option];
		},
		
		saveChatOption: function(option, value) {
			var options     = JSON.parse(localStorage['chatoptions'] || '{}');
			options[option] = value;
			localStorage['chatoptions'] = JSON.stringify(options);
		}
		
	});
	
	// should be moved somewhere better
	$(window).on('resize.chat',function(){
		$('.chat.chat-frame').each(function(){
			$(this).data('chat').resize();
		});
	});
	
	
})(jQuery);

// USER FEATURES
var UserFeatures = {
	PROTECTED 	: 'protected',
	SUBSCRIBER	: 'subscriber',
	VIP			: 'vip',
	MODERATOR	: 'moderator',
	ADMIN		: 'admin'
};

var ChatMessageStatus = {
	SENT		: 'sent',
	UNSENT		: 'unsent',
	PENDING		: 'pending',
	FAILED		: 'failed'
};

//CHAT USER
function ChatUser(args){
	args = args || {};
	this.username = args.nick || '';
	this.features = [];
	this.connections = 0;
	args.features = args.features || [];
	$.extend(this, args);
	return this;
};
ChatUser.prototype.getFeatureHTML = function(){
	var icons = '';
	for (var i = this.features.length - 1; i >= 0; i--) {
		switch(this.features[i]){
			case UserFeatures.SUBSCRIBER :
				icons += '<i class="icon-star" title="Subscriber"/>';
				break;
			case UserFeatures.VIP :
				icons += '<i class="icon-film" title="VIP"/>';
				break;
			case UserFeatures.MODERATOR :
				icons += '<i class="icon-leaf" title="Moderator"/>';
				break;
			case UserFeatures.ADMIN :
				icons += '<i class="icon-fire" title="Administrator"/>';
				break;
		}
	}
	return icons;
};

//UI MESSAGE
function ChatUIMessage(html){
	return this.init(html);
};
ChatUIMessage.prototype.init = function(html){
	this.message = html;
	return this;
};
ChatUIMessage.prototype.html = function(){
	return this.wrap(this.wrapMessage());
};
ChatUIMessage.prototype.wrap = function(html){
	return '<div>'+html+'</div>';
};
ChatUIMessage.prototype.wrapMessage = function(){
	return this.message;
};

//BASE MESSAGE
// will find a nice home for these
var emoteregex = /ArsonNoSexy|AsianGlow|BCWarrior|BORT|BibleThump|BionicBunion|BlargNaut|BloodTrail|BrainSlug|BrokeBack|CougarHunt|DAESuppy|DBstyle|DansGame|DatSheffy|EagleEye|EvilFetus|FPSMarksman|FUNgineer|FailFish|FrankerZ|FreakinStinkin|FuzzyOtterOO|GingerPower|HassanChop|HotPokket|ItsBoshyTime|JKanStyle|Jebaited|JonCarnage|Kappa|KevinTurtle|Kreygasm|MVGame|MrDestructoid|NinjaTroll|NoNoSpot|OMGScoots|OneHand|OpieOP|OptimizePrime|PJSalt|PMSTwin|PazPazowitz|PicoMause|PogChamp|Poooound|PunchTrees|RedCoat|ResidentSleeper|RuleFive|SMOrc|SMSkull|SSSsss|ShazBotstix|SoBayed|SoonerLater|StoneLightning|StrawBeary|SuperVinlin|SwiftRage|TehFunrun|TheRinger|TheTarFu|TinyFace|TooSpicy|TriHard|UleetBackup|UnSane|Volcania|WinWaker/;
var linkregex = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;

function ChatMessage(message, timestamp){
	return this.init(message, timestamp);
};
ChatMessage.prototype.init = function(message, timestamp){
	this.message = message;
	this.timestamp = moment.utc(timestamp).local();
	this.state = null;
	return this;
};
ChatMessage.prototype.status = function(state){
	if(this.ui){
		if(state){
			this.ui.attr('class', state);
		}else{
			this.ui.removeAttr('class');
		}
	}
	this.state = state;
	return this;
};
ChatMessage.prototype.wrapTime = function(){
	return '<time datetime="'+this.timestamp.format('MMMM Do YYYY, h:mm:ss a')+'">'+this.timestamp.format('HH:mm')+'</time>';
};
ChatMessage.prototype.wrapMessage = function(){
	return $('<span/>').text(this.message).html();
};
ChatMessage.prototype.html = function(){
	return this.wrap(this.wrapTime() + ' ' + this.wrapMessage());
};
ChatMessage.prototype.wrap = function(content){
	return '<div>'+content+'</div>';
};
// USER MESSAGE
function ChatUserMessage(message, user, timestamp){
	this.init(message, timestamp);
	// strip the /me
	this.isEmote = false;
	if (this.message.substring(0, 4) === '/me ') {
		this.isEmote = true;
		this.message = this.message.substring(4);
	}
	this.user = user;
	return this;
};
$.extend(ChatUserMessage.prototype, ChatMessage.prototype);
ChatUserMessage.prototype.wrapUser = function(user){
	return user.getFeatureHTML() +' <a class="user '+ user.features.join(' ') +'">' +user.username+'</a>';
};
ChatUserMessage.prototype.wrapMessage = function(){
	var elem  = $('<msg/>').text(this.message),
	    emote = emoteregex.exec(elem.text());
	elem.html(elem.text().replace(linkregex, '<a href="$1" target="_blank" class="externallink">$1</a>'));
	if (emote) {
		var emoteelem = '<div title="'+emote[0]+'" class="twitch-emote twitch-emote-' + emote[0] +'"></div>';
		elem.html(elem.text().replace(emote[0], emoteelem));
	}
	if(this.isEmote){
		elem.addClass('emote');
	}
	return elem[0].outerHTML;
};
ChatUserMessage.prototype.html = function(){
	return this.wrap(this.wrapTime() + ' ' + ((!this.isEmote) ? '' : '*') + this.wrapUser(this.user) + ((!this.isEmote) ? ': ' : ' ') + this.wrapMessage());
};
ChatUserMessage.prototype.addonHtml = function(){
	if(this.isEmote)
		return this.wrap(this.wrapTime() + ' *' + this.wrapUser(this.user) + ' ' + this.wrapMessage());
	return this.wrap(this.wrapTime() + ' <span class="continue">&gt;</span> ' + this.wrapMessage());
};