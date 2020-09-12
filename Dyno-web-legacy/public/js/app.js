/* eslint-disable */
(function ($) {

	$(document).ready(function() {

		var successTimeout, errorTimeout;


		if (window.location.hash) {
			var hash = window.location.hash;

			if (hash) {
				var parts = hash.replace('module-', '').replace(/^#?\//, '').split('-'),
					tab = hash.indexOf('module-') > -1 ? 'module-' + parts.join('-') :
						(parts.length > 1 ? 'module-' + parts[0] : parts[0]);

				setTimeout(function () {
					var $tab = $('#' + tab);
					var $tabControl = $('.tab-control[href="#/' + tab + '"]');

					if (parts.length > 1) {
						var $subtab = $('#' + parts.join('-'));
						var $subtabControl = $('.subtab-control[href="' + '#/' + parts.join('-') + '"]');

						$subtabControl.closest('.tabs').find('li').removeClass('is-active');
						$subtab.closest('.tab-content').find('.subtab-content').removeClass('is-active');
						$subtabControl.parent().addClass('is-active');
						$subtab.addClass('is-active');
					}

					$('.tab-control').removeClass('is-active');
					$('.tab-content').removeClass('is-active');
					$('#loader').removeClass('is-active');
					$tabControl.addClass('is-active');
					$tab.addClass('is-active');
					
					if (parts.length <= 1) return;
				}, 200);
			} else {
				$('#loader').removeClass('is-active');
				$('#settings').addClass('is-active');
				$('.tab-control[href="#/settings"]').addClass('is-active');
			}
		} else {
			$('#loader').removeClass('is-active');
			$('#settings').addClass('is-active');
			$('.tab-control[href="#/settings"]').addClass('is-active');
		}

		function showSuccess(msg) {
			clearTimeout(successTimeout);
			$('.success').find('p').html(msg);
			$('.success').removeClass('is-hidden')

			successTimeout = setTimeout(function () {
				$('.success').addClass('is-hidden');
			}, 5000);
		}

		function showError(msg) {
			clearTimeout(errorTimeout);
			$('.error').find('p').html(msg);
			$('.error').removeClass('is-hidden')

			errorTimeout = setTimeout(function () {
				$('.error').addClass('is-hidden');
			}, 10000);
		}

		function apiPost(url, data, callback) {
			if (typeof data === 'function') {
				callback = data;
				data = {};
			}

			var options = {
				method: 'POST',
				url: url,
			};

			data = data || {};

			if (data) {
				options.data = data;
			}

			$.ajax(options).done(function (msg) {
				return callback(null, msg);
			}).fail(function () {
				return callback(true);
			});
		}

		$('.oauth').on('click', function (e) {
			e.preventDefault();
			window.open($(this).attr('href'), 'addbotpage', 'width=495,height=600');
		});

		// handle tabs
		$('.tab-control').on('click', function (e) {
			// e.preventDefault();
			var tab = $(this).attr('href').replace(/^#?\//, '#');
			
			$('.tab-control').removeClass('is-active');
			$('.tab-content').removeClass('is-active');
			$(this).addClass('is-active');
			$(tab).addClass('is-active');
		});

		// handle subtabs
		$('.subtab-control').on('click', function (e) {
			// e.preventDefault();
			var tab = $(this).attr('href').replace(/^#?\//, '#');
			
			// $('.subtab-control').parent().removeClass('is-active');
			$(this).closest('.tabs').find('li').removeClass('is-active');
			$(this).closest('.tab-content').find('.subtab-content').removeClass('is-active');
			$(this).parent().addClass('is-active');
			$(tab).addClass('is-active');
		});

		// Server selector
		$('.server-select').on('change', function () {
			window.location.href = '/server/' + $(this).val();
		});

		// module checkboxes
		$('.module').on('change', function () {
			var module = $(this).val(),
				enabled = this.checked,
				url = '/api/server/' + server + '/updateMod',
				data = { module: module, enabled: enabled };

			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');
				var enabledOrDisabled = enabled ? 'enabled' : 'disabled'
				return showSuccess("Module '" + module + "' has been " + enabledOrDisabled + '.');
			});
		});

		$('.module-toggle, .command-toggle').on('click', function (e) {
			if (e.target !== this) return;

			var $checkbox = $(this).find('input[type=checkbox]'),
				checked = $checkbox.prop('checked');

			$checkbox.prop('checked', checked ? false : true).attr('checked', 'checked').trigger('change');
		});

		// command checkboxes
		$('.command').on('change', function () {
			var command = $(this).val(),
				enabled = this.checked,
				url = '/api/server/' + server + '/updateCmd',
				data = { command: command, enabled: enabled };

			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');
				var enabledOrDisabled = enabled ? 'enabled' : 'disabled'
				return showSuccess("Command '" + command + "' has been " + enabledOrDisabled + '.');
			});
		});

		// Update nickname
		$('.nick').on('click', function (e) {
			e.preventDefault();
			var nick = $(this).prev('input[type=text]').val(),
				maxLength = $(this).attr('maxlength'),
				url = '/api/server/' + server + '/updateNick',
				data = { nick: nick };

			if (maxLength && nick.length > maxLength) {
				return showError('Nickname is too long.');
			}

			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');
				return showSuccess('Nickname changed to ' + nick);
			});
		});

		$('.remove-moderator').on('click', function (e) {
			e.preventDefault();

			var $el = $(this),
				id = $el.attr('id'),
				url = '/api/server/' + server + '/removeModerator',
				data = { id: id };

			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');
				showSuccess('Removed moderator.');
				$el.closest('.mod').remove();
			});
		});

		// text box submits (when they press enter)
		$('.text-form').on('submit', function (e) {
			$(this).find('.button').click();
			e.preventDefault();
			return;
		});

		// update settings (by clicking the update button)
		$('.update-setting').on('click', function (e) {
			e.preventDefault();

			var text = $(this).prev('input[type=text]'),
				setting = text.attr('name'),
				maxLength = text.attr('maxlength'),
				url = '/api/server/' + server + '/updateSetting',
				data = { setting: setting, value: text.val() };

			if (maxLength && text.val().length > maxLength) {
				return showError('Setting length is too long.');
			}

			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');
				return showSuccess('Changed ' + setting + ': ' + text.val());
			});
		});

		// bot setting checkboxes
		$('.setting-checkbox').on('change', function () {
			var setting = $(this).attr('name'),
				enabled = this.checked,
				url = '/api/server/' + server + '/updateSetting',
				data = { setting: setting, value: enabled };

			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');
				var enabledOrDisabled = enabled ? 'enabled' : 'disabled'
				return showSuccess("'" + setting + "' has been " + enabledOrDisabled + '.');
			});
		});

		// beta checkbox
		$('.beta-checkbox').on('change', function () {
			var setting = $(this).attr('name'),
				enabled = this.checked,
				url = '/api/server/' + server + '/updateSetting',
				data = { setting: setting, value: enabled };

			apiPost(url, data, function (err) {
				if (err) return showError('An error occurred.');
				var enabledOrDisabled = enabled ? 'Enabled' : 'Disabled';
				var redirect = enabled ? 'https://beta.dynobot.net' : 'https://www.dynobot.net';

				showSuccess(enabledOrDisabled + ' Dyno Beta, redirecting you to ' + redirect);

				// redirect
				window.location.href = redirect;
			});
		});

		// update module settings (by clicking the button)
		$('.update-module-setting').on('click', function (e) {
			e.preventDefault();

			var parent = $(this).closest('form'),
				text = parent.find('input[type=text], textarea'),
				module = text.attr('data-module'),
				setting = text.attr('name'),
				url = '/api/server/' + server + '/updateModSetting',
				data = { module: module, setting: setting, value: text.val() };

			console.log(text);

			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');
				return showSuccess('Changed ' + setting + ': ' + text.val());
			});
		});

		// announcement setting checkboxes
		$('.module-setting-checkbox').on('change', function () {
			var setting = $(this).attr('name'),
				module = $(this).attr('data-module'),
				enabled = this.checked,
				url = '/api/server/' + server + '/updateModSetting',
				data = { module: module, setting: setting, value: enabled };

			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');
				var enabledOrDisabled = enabled ? 'enabled' : 'disabled'
				return showSuccess("'" + setting + "' has been " + enabledOrDisabled + '.');
			});
		});

		// module setting dropdowns
		$('.setting-dropdown').on('change', function () {
			var setting = $(this).attr('name'),
				module = $(this).attr('data-module'),
				value = $(this).val(),
				url = '/api/server/' + server + '/updateModSetting',
				data = { module: module, setting: setting, value: value };

			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');
				var enabledOrDisabled = enabled ? 'enabled' : 'disabled'
				return showSuccess(setting + " changed.");
			});
		});


		// Module channel adding
		$('.add-module-item').on('click', function (e) {
			e.preventDefault();

			var data = $(this).closest('form').serializeArray(),
				url = '/api/server/' + server + '/moduleItem/add';

			data.push({ name: 'module', value: $(this).attr('data-module') });
			data.push({ name: 'setting', value: $(this).attr('data-setting') });

			console.log($.param(data));

			apiPost(url, $.param(data), function (err, msg) {
				if (err) return showError('An error occurred.');
				showSuccess(msg.value + ' added');
				return location.reload();
			});
		});

		// Module channel removing
		$('.remove-module-item').on('click', function (e) {
			e.preventDefault();

			var $el = $(this).closest('tr'),
				id = $(this).attr('data-id'),
				module = $(this).attr('data-module'),
				setting = $(this).attr('data-setting'),
				url = '/api/server/' + server + '/moduleItem/remove',
				data = { module: module, setting: setting, id: id };

			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');
				showSuccess(msg.value + ' removed.');
				return $el.remove();
			});
		});

		$('.item-channel').on('change', function () {
			var name = $('option:selected', this).attr('data-name');
			$(this).closest('form').find('input[name=name]').val(name);
		});


		$('.playlist-remove').on('click', function (e) {
			e.preventDefault();
			var $el = $(this),
				index = $el.attr('id'),
				url = '/api/server/' + server + '/playlist/delete',
				data = { index: index };

			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');
				return $el.closest('tr').remove();
			});
		});

		$('.playlist-clear').on('click', function (e) {
			e.preventDefault();

			var $el = $(this),
				url = '/api/server/' + server + '/playlist/clear';

			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');
				return $el.closest('tr').remove();
			});
		});


		// custom commands

		function createCommand($form) {
			var url = '/api/server/' + server + '/customCommand/create',
				data = $form.serialize();

			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');
				
				$form.find('input[type=text]').val('');
				$form.find('textarea').val('');
				showSuccess("Command created.");
				return location.reload();
			});
		}

		$('.new-command a.button').on('click', function (e) {
			e.preventDefault();
			var $form = $(this).closest('form');
			createCommand($form);
		});

		$('.new-command').on('submit', function (e) {
			e.preventDefault();
			var $form = $(this);
			createCommand($form);
		});

		$('.command-remove').on('click', function (e) {
			e.preventDefault();

			var $el = $(this),
				command = $el.attr('data-command'),
				url = '/api/server/' + server + '/customCommand/delete',
				data = { command: command };

			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');
				showSuccess('Command removed.');
				return $el.closest('tr').remove();
			});
		});


		// auto responder

		function createResponse($form) {
			var url = '/api/server/' + server + '/autoResponse/create',
				data = $form.serialize();

			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');
				
				$form.find('input[type=text]').val('');
				$form.find('textarea').val('');
				showSuccess("Response created.");
				return location.reload();
			});
		}

		$('.new-response a.button').on('click', function (e) {
			e.preventDefault();
			var $form = $(this).closest('form');
			createResponse($form);
		});

		$('.new-response').on('submit', function (e) {
			e.preventDefault();
			var $form = $(this);
			createResponse($form);
		});

		$('.response-remove').on('click', function (e) {
			e.preventDefault();

			var $el = $(this),
				command = $el.attr('data-command'),
				url = '/api/server/' + server + '/autoResponse/delete',
				data = { command: command };

			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');
				showSuccess('Response removed.');
				return $el.closest('tr').remove();
			});
		});


		// Automod banned words

		$('.banned-words-add .button').on('click', function (e) {
			e.preventDefault();

			var words = $(this).closest('form').find('textarea').val(),
				url = '/api/server/' + server + '/bannedWords/add',
				data = { words: words };

			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');
				showSuccess('Words added.');
				return location.reload();
			});
		});

		$('.banned-words-remove').on('click', function (e) {
			e.preventDefault();

			var $el = $(this).closest('.tag'),
				word = $(this).attr('data-tag'),
				url = '/api/server/' + server + '/bannedWords/remove',
				data = { word: word };

			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');
				showSuccess(word + ' removed.');
				return $el.remove();
			});
		});

		$('.banned-words-clear').on('click', function (e) {
			e.preventDefault();

			var $el = $(this),
				url = '/api/server/' + server + '/bannedWords/clear';

			apiPost(url, function (err, msg) {
				if (err) return showError('An error occurred.');
				showSuccess('Banned words cleared.');
				$el.closest('.subtab-content').find('.tag.badword').remove();
			});
		});


		// Automod whitelist urls

		$('.add-whitelist-url').on('click', function (e) {
			e.preventDefault();

			var dataUrl = $(this).prev('input[type=text]').val(),
				url = '/api/server/' + server + '/whitelistUrl/add',
				data = { url: dataUrl };

			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');
				showSuccess('URL added.');
				return location.reload();
			});
		});

		$('.remove-whitelist-url').on('click', function (e) {
			e.preventDefault();

			var $el = $(this).closest('tr'),
				dataUrl = $(this).attr('data-url'),
				url = '/api/server/' + server + '/whitelistUrl/remove',
				data = { url: dataUrl };

			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');
				showSuccess(dataUrl + ' removed.');
				return $el.remove();
			});
		});

		$('.add-blacklist-url').on('click', function (e) {
			e.preventDefault();

			var dataUrl = $(this).prev('input[type=text]').val(),
				url = '/api/server/' + server + '/blacklistUrl/add',
				data = { url: dataUrl };

			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');
				showSuccess('URL added.');
				return location.reload();
			});
		});

		$('.remove-blacklist-url').on('click', function (e) {
			e.preventDefault();

			var $el = $(this).closest('tr'),
				dataUrl = $(this).attr('data-url'),
				url = '/api/server/' + server + '/blacklistUrl/remove',
				data = { url: dataUrl };

			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');
				showSuccess(dataUrl + ' removed.');
				return $el.remove();
			});
		});


		// Github webhook

		$('.webhook-dropdown').on('change', function () {
			var channel = $(this).val(),
				url = '/github/generate',
				data = { channel: channel };

			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');
				$('.webhook-output').html(msg);
			});
		});

	});

})(jQuery);