import React, { Component } from 'react';
import { Button, Text, Left, Linking, Body, Header, Right, Content, Icon, List, ListItem, Container, Separator, Thumbnail } from 'native-base';
import styles from '../styles.js';

export class Guild extends Component {
	constructor() {
		super();
		this.state = {
			settings: {},
			guild: {},
		}
	}

	componentWillMount() {
		this.updateState();
	}

	async updateState() {
		const { guild } = this.props;

		let guildSettings = 'api calls to mobile-api blah blah blah';
		guildSettings = {
			premium: false,
			prefix: '?',
			nick: 'Dyno',
			modules: [
				{
					name: 'Automod',
					enabled: true
				},
				{
					name: 'Action Log',
					enabled: false
				},
				{
					name: 'Autoresponder',
					enabled: true
				},
				{
					name: 'Custom Commands',
					enabled: false
				},
				{
					name: 'Message Embedder',
					enabled: true
				}, {
					name: 'Auto Purge',
					enabled: false
				}, {
					name: 'Autoroles',
					enabled: true
				}, {
					name: 'Announcements',
					enabled: false
				}, {
					name: 'Auto Message',
					enabled: true
				}, {
					name: 'Tags',
					enabled: false
				},
			]
		};

		this.setState({ settings: guildSettings, guild });
	}

	render() {
		let premium;
		let enabledModules = this.state.settings.modules.filter(m => m.enabled);
		let disabledModules = this.state.settings.modules.filter(m => !m.enabled);
		if (this.state.settings.premium) {
			premium = (
				<Button style={styles.premium} onPress={() => { }}>
					<Text style={[styles.text, styles.premiumText]}>PREMIUM SERVER</Text>
				</Button>
			);
		} else {
			premium = (
				<Button style={styles.premium} onPress={() => { this.getPremium }}>
					<Text style={[styles.text, styles.premiumText]}>UPGRADE TO PREMIUM</Text>
				</Button>
			);
		}

		// enabledModules = [
		// 	{ name: 'Autoresponder', },
		// 	{ name: 'Custom Commands' },
		// 	{ name: 'Announcements', }
		// ];

		return (
			<Container style={styles.mainContainer}>
				<Container style={styles.serverInfo}>
					<Thumbnail style={styles.guildIcon} source={{ uri: this.state.guild.icon }} />
					<Text style={[styles.text, styles.guildName]}>{this.state.guild.name}</Text>
					<Text style={[styles.text, styles.memberCount]}>{this.state.guild.memberCount} members</Text>
					<Container style={styles.serverInfo}>
						{premium}
					</Container>
				</Container>
				<Container>
					<Content>
						<Separator bordered style={{ backgroundColor: '#333' }}>
							<Text style={[styles.text, { fontSize: 13 }]}>ENABLED MODULES</Text>
						</Separator>
						<List dataArray={enabledModules}
							renderRow={(item) =>
								<ListItem button onPress={() => this.gotoModule(module)}>
									<Body>
										<Text style={[styles.text, { textAlign: 'center' }]}>{item.name}</Text>
									</Body>
								</ListItem>
							}>
						</List>
						<Separator bordered style={{ backgroundColor: '#333' }}>
							<Text style={[styles.text, { fontSize: 13 }]}>DISABLED MODULES</Text>
						</Separator>
						<List dataArray={disabledModules}
							renderRow={(item) =>
								<ListItem button onPress={() => this.gotoModule(module)}>
									<Body>
										<Text style={[styles.text, { textAlign: 'center' }]}>{item.name}</Text>
									</Body>
								</ListItem>
							}>
						</List>
					</Content>
				</Container>
			</Container>
		);
	}

	getPremium() {
		// Alert.alert(this.state.settings.modules.filter(m => m.enabled)[0])
		Linking.openURL('https://dyno.gg/upgrade');
	}

	gotoModule(module) {

	}
}

