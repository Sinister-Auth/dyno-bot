const { Command } = require('@dyno.gg/dyno-core');
const superagent = require('superagent');

class Define extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['define'];
		this.module       = 'Fun';
		this.description  = 'Define a word (case sensitive).';
		this.usage        = 'define [word]';
		this.example      = 'define dyno';
		this.cooldown     = 5000;
		this.expectedArgs = 1;
	}

	capitalizeFirstLetter(str) {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}

	async execute({ message, args }) {
		const dynoWords = [
			'dyno',
			'<@155149108183695360>', // dyno
			'<@!155149108183695360>',
			'<@168274283414421504>', // premium
			'<@!168274283414421504>',
			'<@174603896990203905>', // dev
			'<@!174603896990203905>',
		];

		let word = args[0];
		let res;
		let definition;
		let example;
		let part_of_speech;

		if (dynoWords.find(w => word.toLowerCase().startsWith(w))) {
			definition = this.dyno.globalConfig.definition || `Moderation. Music. Commands. Utilities. Fun. It's the best Discord bot™`;
			example = 'Dude have you checked out Dyno? It\'s literally the best bot.';
			part_of_speech = 'best bot';
			word = 'Dyno';
		} else {
			try {
				res = await superagent.get(`https://en.wiktionary.org/api/rest_v1/page/definition/${word}`);
				definition = capitalizeFirstLetter(res.body.en[0].definitions[0].definition.replace(/<(?:.|\n)*?>/gm, ""));
				if (res.body.en[0].definitions[0].examples) example = "\n" + res.body.en[0].definitions[0].examples.map(g => "- " + capitalizeFirstLetter(g.replace("<b>", "__").replace("</b>", "__").replace(/<(?:.|\n)*?>/gm, ""))).join('\n')
				part_of_speech = res.body.en[0].partOfSpeech;
			} catch (err) {
				return this.error(message.channel, 'Couldn\'t find any definition for this word!');
			}
		}
		return this.sendMessage(message.channel, {
			embed: {
				title: `Word: ${this.capitalizeFirstLetter(word)}`,
				description: `**Definition:** ${definition}${example ? `\n\n**Example(s):** ${example}` : ``}`,
				color: 0x3498db,
				footer: {
					text: `Part of speech: ${part_of_speech}`,
				},
				timestamp: new Date(),
			}
		});
	}
}

module.exports = Define;
