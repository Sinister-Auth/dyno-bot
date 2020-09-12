import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';
import * as each from 'async-each';

export default class Role extends Command {
	public aliases: string[] = ['role'];
	public group: string = 'Manager';
	public description: string = 'Add/remove a user to a role or roles.';
	public defaultUsage: string = 'role [user] [role name]';
	public permissions: string = 'serverAdmin';
	public cooldown: number = 5000;
	public expectedArgs: number = 2;
	public requiredPermissions: string[] = ['manageRoles'];
	public defaultCommand: string = 'user';

	public commands: SubCommand[] = [
		{ name: 'user', desc: 'Add/remove a user to a role or roles.', default: true, usage: 'role [user] [role]' },
		{ name: 'add', desc: 'Add a user to a role or roles.', usage: 'role add [user] [role]' },
		{ name: 'remove', desc: 'Remove a user from a role or roles.', usage: 'role remove [user] [role]' },
		{ name: 'toggle', desc: 'Toggle a user from a role or roles.', usage: 'role toggle [user] [role]' },
		{ name: 'removeall', desc: 'Remove all roles from a user', usage: 'role removall [user]' },
		{ name: 'all', desc: 'Add/remove all users to or from a role. (Limit 1 role)', usage: 'role all [role]' },
		{ name: 'bots', desc: 'Add/remove all bots to or from a role.', usage: 'role bots [role]' },
		{ name: 'humans', desc: 'Add/remove all humans to or from a role.', usage: 'role humans [role]' },
		{ name: 'in', desc: 'Add/remove users to or from a role that are in a role. (Limit 1 role)', usage: 'role in [in role], [role]' },
	];

	public usage: string[] = [
		'role [user] [role]',
		'role [user] [role], [role], [role]',
		'role [user] +[role]',
		'role [user] +[role], -[role]',
		'role add [user] [role]',
		'role remove [user] [role]',
		'role toggle [user] [role]',
		'role all +[role]',
		'role bots [role]',
		'role humans [role]',
		'role in [role], [role]',
	];

	public example: string[] = [
		'role NoobLance Accomplices',
		'role NoobLance Regulars, Accomplices',
		'role NoobLance +Members, -Newbies',
		'role NoobLance Regulars, Accomplices, The Hammer, Overseers',
		'role all Humans',
		'role all -Humans',
		'role bots Boats',
		'role humans Humans',
		'role in The Hammer, Secret Fights',
		'role in Accomplices, -Accomplices',
	];

	public async execute() {
		return Promise.resolve();
	}

	public all({ message, args, guildConfig, filter, t }: CommandData) {
		const guild = (<eris.GuildChannel>message.channel).guild;

		if (!this.hasPermissions(guild, 'manageRoles')) {
			return this.error(message.channel, `I don't have \`Manager Roles\` permissions.`);
		}

		const arg = args.join(' ');
		const search = arg.replace(/^(\+|-)/, '');
		const role = this.resolveRole(guild, search);

		if (!role) {
			return this.error(message.channel, `I couldn't find the ${search} role.`);
		}

		if (!this.hasRoleHierarchy(guild, role)) {
			return this.error(message.channel, `My role isn't high enough to assign members to this role.`);
		}

		let members = [...guild.members.values()];

		if (filter) {
			try {
				members = members.filter(filter);
			} catch (err) {
				this.logger.error(err);
				return this.error(message.channel, t('general.unknown-error'));
			}
		}

		members = arg.startsWith('-') ?
			members.filter((m: eris.Member) => m.roles.includes(role.id)) :
			members.filter((m: eris.Member) => !m.roles.includes(role.id));

		each(members, (member: eris.Member) => {
			if (arg.startsWith('+') && member.roles.includes(role.id)) { return; }
			if (arg.startsWith('-') && !member.roles.includes(role.id)) { return; }

			if (arg.startsWith('+')) {
				return member.addRole(role.id, encodeURIComponent(`Responsible User: ${this.utils.fullName(message.author)}`));
			}

			if (arg.startsWith('-')) {
				return member.removeRole(role.id, encodeURIComponent(`Responsible User: ${this.utils.fullName(message.author)}`));
			}

			return member.addRole(role.id, encodeURIComponent(`Responsible User: ${this.utils.fullName(message.author)}`));
		});

		let text = `Changing roles for ${members.length} members.`;
		if (members.length > 20) {
			text += ' This may take a while.';
		}

		return this.sendMessage(message.channel, text);
	}

	public bots({ message, args, t }: CommandData) {
		return this.all({
			message,
			args,
			filter: (m: eris.Member) => m.bot,
			t,
		});
	}

	public humans({ message, args, t }: CommandData) {
		return this.all({
			message,
			args,
			filter: (m: eris.Member) => !m.bot,
			t,
		});
	}

	public in({ message, args, t }: CommandData) {
		let [inSearch, roleSearch] = args.join(' ').split(',');

		inSearch = inSearch.trim();
		roleSearch = roleSearch.trim();

		const inRole = this.resolveRole(message.guild, inSearch);
		if (!inRole) {
			return this.error(message.channel, `I couldn't find the ${inSearch} role.`);
		}

		return this.all({
			message,
			args: [roleSearch],
			filter: (m: eris.Member) => m.roles.includes(inRole.id),
			t,
		});
	}

	public async user({ message, args, t }: CommandData) {
		const member = <eris.Member>this.resolveUser(message.channel.guild, args[0]);

		if (!member) {
			return this.error(message.channel, `Couldn't find that user.`);
		}

		const roleArgs = args.slice(1).join(' ')
			.replace(/, /g, ',')
			.split(',');

		const roles = [...member.roles];
		const invalidRoles = [];
		const roleChanges = [];

		for (const arg of roleArgs) {
			const search = arg.replace(/^(\+|-)/, '');
			const role = this.resolveRole(message.channel.guild, search);

			if (!role) {
				invalidRoles.push(search);
				continue;
			}

			if (arg.startsWith('+') && roles.indexOf(role.id) > -1) { continue; }
			if (arg.startsWith('-') && roles.indexOf(role.id) === -1) { continue; }

			if (arg.startsWith('+')) {
				roleChanges.push({ add: true, role });
				continue;
			}

			const index = member.roles.indexOf(role.id);

			if (arg.startsWith('-')) {
				roleChanges.push({ remove: true, role });
				continue;
			}

			if (index > -1) {
				roleChanges.push({ remove: true, role });
				continue;
			}

			roleChanges.push({ add: true, role });
		}

		if (invalidRoles.length) {
			return this.error(message.channel, `I can't find the role(s) ${invalidRoles.join(',')}.`);
		}

		if (!roleChanges.length) {
			return this.sendMessage(message.channel, `No changes were made.`);
		}

		const changes = [];

		for (const change of roleChanges) {
			const index = roles.indexOf(change.role.id);

			if (change.remove) {
				roles.splice(index, 1);
				changes.push(`-${change.role.name}`);
			} else if (change.add) {
				roles.push(change.role.id);
				changes.push(`+${change.role.name}`);
			}
		}

		return member.edit({ roles }, encodeURIComponent(`Responsible User: ${this.utils.fullName(message.author)}`))
			.then(() => this.success(message.channel,
				`Changed roles for ${this.utils.fullName(member)}, ${changes.join(', ')}`))
			.catch((err: any) => this.error(message.channel,
				`I couldn't change the roles for that user. Please check my permissions and role position.`, err));
	}

	public async add({ message, args }: CommandData) {
		const member = <eris.Member>this.resolveUser(message.channel.guild, args[0]);

		if (!member) {
			return this.error(message.channel, `Couldn't find that user.`);
		}

		const roleArgs = args.slice(1).join(' ')
			.replace(/, /g, ',')
			.split(',');

		const roles = [...member.roles];
		const invalidRoles = [];
		const roleChanges = [];

		for (const search of roleArgs) {
			const role = this.resolveRole(message.channel.guild, search);

			if (!role) {
				invalidRoles.push(search);
				continue;
			}

			roleChanges.push({ role });
		}

		if (invalidRoles.length) {
			return this.error(message.channel, `I can't find the role(s) ${invalidRoles.join(',')}.`);
		}

		if (!roleChanges.length) {
			return this.sendMessage(message.channel, `No changes were made.`);
		}

		const changes = [];

		for (const change of roleChanges) {
			roles.push(change.role.id);
			changes.push(`added ${change.role.name}`);
		}

		return member.edit({ roles }, encodeURIComponent(`Responsible User: ${this.utils.fullName(message.author)}`))
			.then(() => this.success(message.channel,
				`Changed roles for ${this.utils.fullName(member)}, ${changes.join(', ')}`))
			.catch((err: any) => this.error(message.channel,
				`I couldn't change the roles for that user. Please check my permissions and role position.`, err));
	}

	public async remove({ message, args }: CommandData) {
		const member = <eris.Member>this.resolveUser(message.channel.guild, args[0]);

		if (!member) {
			return this.error(message.channel, `Couldn't find that user.`);
		}

		const roleArgs = args.slice(1).join(' ')
			.replace(/, /g, ',')
			.split(',');

		const roles = [...member.roles];
		const invalidRoles = [];
		const roleChanges = [];

		for (const search of roleArgs) {
			const role = this.resolveRole(message.channel.guild, search);

			if (!role) {
				invalidRoles.push(search);
				continue;
			}

			roleChanges.push({ role, index: roles.indexOf(role.id) });
		}

		if (invalidRoles.length) {
			return this.error(message.channel, `I can't find the role(s) ${invalidRoles.join(',')}.`);
		}

		if (!roleChanges.length) {
			return this.sendMessage(message.channel, `No changes were made.`);
		}

		const changes = [];

		for (const change of roleChanges) {
			roles.splice(change.index, 1);
			changes.push(`removed ${change.role.name}`);
		}

		return member.edit({ roles }, encodeURIComponent(`Responsible User: ${this.utils.fullName(message.author)}`))
			.then(() => this.success(message.channel,
				`Changed roles for ${this.utils.fullName(member)}, ${changes.join(', ')}`))
			.catch((err: any) => this.error(message.channel,
				`I couldn't change the roles for that user. Please check my permissions and role position.`, err));
	}

	public removeall({ message, args }: CommandData) {
		const member = <eris.Member>this.resolveUser(message.channel.guild, args[0]);

		if (!member) {
			return this.error(message.channel, `Couldn't find that user.`);
		}

		const roles = message.guild.roles.filter((r: eris.Role) => member.roles.includes(r.id));
		const rolenames = roles.map((r: eris.Role) => r.name);

		return member.edit({ roles: [] }, encodeURIComponent(`Responsible User: ${this.utils.fullName(message.author)}`))
			.then(() => this.success(message.channel,
				`Removed the following roles from ${this.utils.fullName(member)}, ${rolenames.join(', ')}`))
			.catch((err: any) => this.error(message.channel,
				`I couldn't change the roles for that user. Please check my permissions and role position.`, err));
	}

	public async toggle({ message, args }: CommandData) {
		const member = <eris.Member>this.resolveUser(message.channel.guild, args[0]);

		if (!member) {
			return this.error(message.channel, `Couldn't find that user.`);
		}

		const roleArgs = args.slice(1).join(' ')
			.replace(/, /g, ',')
			.split(',');

		const roles = [...member.roles];
		const invalidRoles = [];
		const roleChanges = [];

		for (const search of roleArgs) {
			const role = this.resolveRole(message.channel.guild, search);

			if (!role) {
				invalidRoles.push(search);
				continue;
			}

			const index = member.roles.indexOf(role.id);

			if (index > -1) {
				roleChanges.push({ remove: true, index, role });
				continue;
			}

			roleChanges.push({ add: true, role });
		}

		if (invalidRoles.length) {
			return this.error(message.channel, `I can't find the role(s) ${invalidRoles.join(',')}.`);
		}

		if (!roleChanges.length) {
			return this.sendMessage(message.channel, `No changes were made.`);
		}

		const changes = [];

		for (const change of roleChanges) {
			if (change.remove) {
				roles.splice(change.index, 1);
				changes.push(`removed ${change.role.name}`);
			} else if (change.add) {
				roles.push(change.role.id);
				changes.push(`added ${change.role.name}`);
			}
		}

		return member.edit({ roles }, encodeURIComponent(`Responsible User: ${this.utils.fullName(message.author)}`))
			.then(() => this.success(message.channel,
				`Changed roles for ${this.utils.fullName(member)}, ${changes.join(', ')}`))
			.catch((err: any) => this.error(message.channel,
				`I couldn't change the roles for that user. Please check my permissions and role position.`, err));
	}
}
