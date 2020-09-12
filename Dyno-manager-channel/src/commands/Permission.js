'use strict';

const { Command } = require('@dyno.gg/dyno-core');

const PermissionsVal = {
    createInstantInvite:  1,
    kickMembers:          1 << 1,
    banMembers:           1 << 2,
    administrator:        1 << 3,
    manageChannels:       1 << 4,
    manageGuild:          1 << 5,
    addReactions:         1 << 6,
    viewAuditLogs:        1 << 7,
    voicePrioritySpeaker: 1 << 8,
    readMessages:         1 << 10,
    sendMessages:         1 << 11,
    sendTTSMessages:      1 << 12,
    manageMessages:       1 << 13,
    embedLinks:           1 << 14,
    attachFiles:          1 << 15,
    readMessageHistory:   1 << 16,
    mentionEveryone:      1 << 17,
    externalEmojis:       1 << 18,
    voiceConnect:         1 << 20,
    voiceSpeak:           1 << 21,
    voiceMuteMembers:     1 << 22,
    voiceDeafenMembers:   1 << 23,
    voiceMoveMembers:     1 << 24,
    voiceUseVAD:          1 << 25,
    changeNickname:       1 << 26,
    manageNicknames:      1 << 27,
    manageRoles:          1 << 28,
    manageWebhooks:       1 << 29,
    manageEmojis:         1 << 30,
};

const permissions = [
    'createInstantInvite',
    'kickMembers',
    'banMembers',
    'administrator',
    'manageChannels',
    'manageGuild',
    'addReactions',
    'readMessages',
    'sendMessages',
    'sendTTSMessages',
    'manageMessages',
    'embedLinks',
    'attachFiles',
    'readMessageHistory',
    'mentionEveryone',
    'externalEmojis',
    'voiceConnect',
    'voiceSpeak',
    'voiceMuteMembers',
    'voiceDeafenMembers',
    'voiceMoveMembers',
    'voiceUseVAD',
    'changeNickname',
    'manageNicknames',
    'manageRoles',
    'manageWebhooks',
    'manageEmojis',
];

class Permission extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['permission', 'perm'];
		this.group        = 'Manager';
		this.description  = 'Manage permissions.';
		this.defaultUsage = 'permission [permission] [user | role]';
		this.permissions  = 'serverAdmin';
		this.disableDM    = true;
		this.cooldown     = 5000;
		this.expectedArgs = 2;
		this.requiredPermissions = ['manageRoles'];
		this.defaultCommand = 'toggle';

		this.commands = [
			{ name: 'toggle', desc: 'Toggle a permission.', default: true, usage: 'toggle [permission] [user|role]' },
			{ name: 'neutral', desc: 'Neutral a permission.', usage: 'enutral [permission] [user|role]' },
			{ name: 'enable', desc: 'Enable a permission.', usage: 'enable [permission] [user|role]' },
			{ name: 'disable', desc: 'Disable a permission.', usage: 'disable [permission] [user|role]' },
		];

		this.usage = [
			'permission manageNicknames moderators', // global perms
			'permission manageMessages KhaaZ general', // override perms user
			'permission sendMessage members testing', // override perms role
			'permission enable manageMessages moderators #general', // enable override
			'permission disable attachFiles everyone #general', // disable override (everyone = everyone role)
			'permission -mentionEveryone everyone', // works with -/+
			'permission neutral sendMessages everyone general',
		];
	}

	/**
	 * Check if the bot has/has not perm to do the permission changes
	 * Send the according error message
	 *
	 * @param {Object<Message>} message
	 * @param {String} permission
	 * @param {Object} { channel, role }
	 * @returns {Boolean}
	 * @memberof Permission
	 */
	checkPerms(message, permission, { channel, role }) {
		const botPerms = message.channel.guild.members.get(this.client.user.id).permission.allow;
		const manageRole = PermissionsVal.manageRoles;
		const permNmb = PermissionsVal[permission];

		if (channel && !this.hasChannelPermissions(channel.guild, channel, ['manageRoles'])) {
			this.error(message.channel, `I don't have \`Manager Roles\` permissions.`);
			return false;
		} else if ((botPerms & manageRole) !== manageRole) {
			this.error(message.channel, `I don't have \`Manager Roles\` permissions.`);
			return false;
		}

		if (role && !this.hasRoleHierarchy(message.channel.guild, role)) {
			this.error(message.channel, `My role isn't high enough to assign permission to this role.`);
			return false;
		}

		if ((botPerms & permNmb) !== permNmb) {
			this.error(message.channel, `I don't have \`${permission}\` permissions.`);
			return false;
		}

		return true;
	}

	async execute() {
		return Promise.resolve();
    }

	toggle({ message, args }) { // STATUS 0
		if (args[0].startsWith('+')) {
			return this.enable({ message, args });
		} else if (args[0].startsWith('-')) {
			return this.disable({ message, args });
		}

		if (!permissions.includes(args[0])) {
			return this.error(message.channel, 'This permission doesn\'t exist!');
		}

		return this.pickDest(message, args, args[0], 0);
	}

	enable({ message, args }) { // STATUS 1
		const perm = args[0].replace(/^(\+|-)/, '');
		if (!permissions.includes(perm)) {
			return this.error(message.channel, 'This permission doesn\'t exist');
		}
		return this.pickDest(message, args, perm, 1);
	}

	disable({ message, args }) { // STATUS 2
		const perm = args[0].replace(/^(\+|-)/, '');
		if (!permissions.includes(perm)) {
			return this.error(message.channel, 'This permission doesn\'t exist');
		}
		return this.pickDest(message, args, perm, 2);
	}

	neutral({ message, args }) { // STATUS 3
		const perm = args[0].replace(/^(\+|-)/, '');
		if (!permissions.includes(perm)) {
			return this.error(message.channel, 'This permission doesn\'t exist');
		}
		return this.pickDest(message, args, perm, 3);
	}

	/**
	 * Utility method that pick up the role/user to edit perms
	 * Also calls this.in or this.global depending of the third argument
	 *
	 * @param {Object<Message>} message
	 * @param {Array<String>} args
	 * @param {String} permission
	 * @param {Number} status - 0(toggle), 1(enable), 2(disable), 3(neutral)
	 * @returns {Promise}
	 * @memberof Permission
	 */
	pickDest(message, args, permission, status) {
		let dest;
		if (args[1] === 'everyone') {
			dest = { id: message.channel.guild.id, name: 'everyone' };
		} else {
			dest = this.resolveRole(message.channel.guild, args[1]);
		}
		let type = 'role';

		if (!dest) {
			if (!args[2]) {
				return this.error(message.channel, 'You need to specify a channel to override permission for this user!');
			}
			dest = this.resolveUser(message.channel.guild, args[1]);
			type = 'member';
		}
		if (!dest) {
			return this.error(message.channel, 'No users or roles found!');
		}

		if (args[2]) {
			const channel = this.resolveChannel(message.channel.guild, args[2]);
			if (!channel) {
				return this.error(message.channel, 'No channel found!');
			}
			return this.in(message, dest, channel, permission, type, status);
		} else {
			return this.global(message, dest, permission, status);
		}
	}

	async in(message, dest, channel, permission, type, status) {
		const canExec = this.checkPerms(message, permission, { channel, role: (dest.user ? null : dest) });
		if (!canExec) {
			return;
		}

		let action;
		const permOW = channel.permissionOverwrites.get(dest.id);
		const permNmb = PermissionsVal[permission];
		let allow = 0;
		let deny = 0;

		switch (status) {
			case 0: { // toggle
				if (permOW) {
					if ((permOW.allow & permNmb) === permNmb) { // has perm
						// deny perm
						allow = permOW.allow ^ permNmb;
						deny = permOW.deny | permNmb;
					} else { // doesn't have perm OR neutral
						// allow perm
						allow = permOW.allow | permNmb;
						deny = ((permOW.deny & permNmb) === permNmb) ? permOW.deny ^ permNmb : permOW.deny;
					}
				} else {
					allow = permNmb;
				}

				action = 'toggled';
				break;
			}
			case 1: { // add
				if (permOW) {
					allow = permOW.allow | permNmb;
					deny = ((permOW.deny & permNmb) === permNmb) ? permOW.deny ^ permNmb : permOW.deny;
				} else {
					allow = permNmb;
				}
				action = 'added';
				break;
			}
			case 2: { // remove
				if (permOW) {
					allow = ((permOW.allow & permNmb) === permNmb) ? permOW.allow ^ permNmb : permOW.allow;
					deny = permOW.deny | permNmb;
				} else {
					deny = permNmb;
				}
				action = 'removed';
				break;
			}
			case 3: { // neutral
				if (permOW) {
					allow = ((permOW.allow & permNmb) === permNmb) ? permOW.allow ^ permNmb : permOW.allow;
					deny = ((permOW.deny & permNmb) === permNmb) ? permOW.deny ^ permNmb : permOW.deny;
				}
				action = 'neutralized';
				break;
			}
		}

		try {
			await this.client.editChannelPermission(
				channel.id,
				dest.id,
				allow,
				deny,
				type,
				encodeURIComponent(`Responsible User: ${this.utils.fullName(message.author)}`)
			);
			return this.success(message.channel, `You ${action} the permission \`${permission}\` for ${dest.name || dest.username} in ${channel.mention}!`);
		} catch (err) {
			return this.error(message.channel, 'An unexpected error happened!');
		}
	}

	async global(message, dest, permission, status) {
		const canExec = this.checkPerms(message, permission, { role: dest });
		if (!canExec) {
			return;
		}

		let action;
		const permRole = dest.permissions.allow;
		const permNmb = PermissionsVal[permission];
		let allow;
		switch (status) {
			case 0: { // toggle
				allow = permRole ^ permNmb;
				action = 'toggled';
				break;
			}
			case 1: { // added
				allow = permRole | permNmb;
				action = 'added';
				break;
			}
			case 3: // neutral
			case 2: { // remove
				allow = ((permRole & permNmb) === permNmb) ? permRole ^ permNmb : permRole;
				action = 'removed';
				break;
			}
		}

		try {
			await this.client.editRole(
				message.channel.guild.id,
				dest.id,
				{ permissions: allow },
				encodeURIComponent(`Responsible User: ${this.utils.fullName(message.author)}`)
			);
			return this.success(message.channel, `You ${action} the permission \`${permission}\` for ${dest.name}!`);
		} catch (err) {
			return this.error(message.channel, 'An unexpected error happened!');
		}
	}
}

module.exports = Permission;
