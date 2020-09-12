import {Command} from '@dyno.gg/dyno-core';
import * as eris from '@dyno.gg/eris';

export default class Distance extends Command {
	public aliases: string[] = ['distance'];
	public group: string = 'Misc';
	public description: string = 'Get the distance between two sets of coordinates';
	public usage: string = 'distance [coords] [coords]';
	public cooldown: number = 3000;
	public expectedArgs: number = 2;
	public example: string[] = [
		'distance 51.295978,-1.104938 45.407692,2.4415',
	];

	public execute({ message, args }: CommandData) {
		args = args.join(' ').replace(/, /g, ',').split(' ');

		const coords1 = args[0].split(',');
		const coords2 = args[1].split(',');

		if (!coords1 || !coords2 || coords1.length !== 2 || coords2.length !== 2) {
			return this.error(message.channel, 'Invalid coordinates, please provide two coordinate pairs. See distance help for more info.');
		}

		const distance = this.getDistanceFromLatLonInKm(coords1[0], coords1[1], coords2[0], coords2[1]);
		if (!distance) {
			return this.error(message.channel, 'Invalid coordinates, please provide two coordinate pairs. See distance help for more info.');
		}

		const embed = {
			color: this.utils.getColor('blue'),
			fields: [
				{ name: 'Lat/Lng 1', value: coords1.join(', '), inline: true },
				{ name: 'Lat/Lng 2', value: coords2.join(', '), inline: true },
				{ name: 'Distance (km)', value: distance.toFixed(2).toString() },
			],
		};

		return this.sendMessage(message.channel, { embed });
	}

	private deg2rad(deg: number) {
		return deg * (Math.PI / 180);
	}

	private getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
		const R = 6371;
		const dLat = this.deg2rad(lat2 - lat1);
		const dLon = this.deg2rad(lon2 - lon1);
		const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
				Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
				Math.sin(dLon / 2) * Math.sin(dLon / 2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		return R * c;
	}
}
