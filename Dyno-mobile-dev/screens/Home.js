import React, { Component } from 'react';
import { Image, Linking, Platform } from 'react-native';
import styles from '../styles.js';
import { Container, Footer, FooterTab, Button, Icon, Text } from 'native-base';
import { LocalStorage } from '../db';

export class Home extends Component {
	constructor() {
		super();
		this.OAuthCode = "  "
		this.storage = new LocalStorage();
	}

	componentDidMount() { 
		// if (Platform.OS === 'android') {
		// 	Linking.getInitialURL().then(url => {
		// 		what do with url pls 
		// 	});
		// } else {
		// 	Linking.addEventListener('url', this.handleOpenURL);
		// }
	}

	componentWillUnmount() {
		// Linking.removeEventListener('url', this.handleOpenURL);
	}

	static navigationOptions = {
		title: 'Home',
	};

	render() {

		let guilds = [];
		guilds.push({ key: "1", name: "Guild 1", id: "1" });
		guilds.push({ key: "2", name: "Guild 2", id: "2" });
		guilds.push({ key: "3", name: "Guild 3", id: "3" });
		this.setGuilds(guilds);
		let username = 'Chipped';
		// let avatar = 'https://cdn.discordapp.com/avatars/252541269602074635/204767316ce63537e112350ab0a25436.png';
		let home;
		let button;

		if (username) { // When logged in
			home = (
				<Text style={[styles.title, styles.text]}>Welcome back, {username}!</Text>
			);
			button = (
				<Button primary
					onPress={() =>
						this.onPressButton()
					}
				>
					<Text>MANAGE A SERVER</Text>
				</Button>
			);
		}
		else { // When logged out
			home = (
				<Text style={styles.text}>Dyno is a fully customizable discord bot for your discord server that features a simple and intuitive web dashboard. It brings many features such as moderation, anti-spam/auto-moderation, role management, custom commands, music bot, and much more that will greatly simplify managing your server and provide many useful and interesting features for your members.

					Dyno is used on 929,465 servers, we invite you to try it out and hope you enjoy!</Text>
			);
			button = (
				<Button primary
					onPress={() =>
						this.onPressButton()
					}
				>
					<Text>Login</Text>
				</Button>
			)
		}
		return (
			<Container style={styles.background}>
				<Image source={require('../images/dyno-ghost.png')} style={styles.backgroundImage} />
				{home}
				<Container style={styles.container}>
					{button}
					<Button style={{ marginTop: 25 }} primary
						onPress={() =>
							this.joinDyno()
						}
					>
						<Text>JOIN OUR DISCORD</Text>
					</Button>
				</Container>

				<Footer>
					<FooterTab>
						<Button onPress={() => this.tos()}>
							<Text style={{ fontSize: 13 }}>Terms</Text>
						</Button>
						<Button onPress={() => this.twitter()}>
							<Icon type="FontAwesome" name="twitter" style={{ color: "#1DA1F2", fontSize: 25 }} />
						</Button>
						<Button onPress={() => this.pp()}>
							<Text style={{ fontSize: 13 }}>Privacy</Text>
						</Button>
					</FooterTab>
				</Footer>
				{/* {home} */}
				{/* <Button onPress={() => {
					this._login
				}}>
					<Text>Login</Text>
				</Button> */}
			</Container >
		);
	}

	tos = () => {
		Linking.openURL('https://dyno.gg/terms');
	}

	twitter = () => {
		Linking.openURL('https://twitter.com/DynoDiscord');
	}

	pp = () => {
		Linking.openURL('https://dyno.gg/policy');
	}

	joinDyno = () => {
		Linking.openURL('https://discord.gg/9W6EG56');
	}

	onPressButton = () => {
		this.props.navigator.push({
			screen: 'dyno.Guilds',
			title: 'Manage Server',
			backButtonHidden: true,
            navigatorButtons: {
                leftButtons: [{
                    id: 'sideMenu'
                }]
            },
		});
	}
	async setGuilds(guilds) {
		await this.storage.set("guilds", guilds.toString());
	}

	_login() {

		const state = Math.random() + '';

		this._boundListener = this._handleUrl.bind(this);

		Linking.addEventListener('url', this._boundListener);

		Linking.openURL([
			'https://discordapp.com/oauth2/authorize',
			'?redirect_uri=https%3A%2F%2Fnubbot.ngrok.io%2Fforward',
			'&scope=identify%20guilds',
			'&response_type=code',
			`&client_id=${this.config.client.id}`,
		].join(''));
	}

	_getToken(code) {
		const tokenUrl = 'https://discordapp.com/api/oauth2/token';
		fetch(tokenUrl, {
			method: "POST",
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Accept': 'application/json'
			},
			body: JSON.stringify({
				grant_type: 'authorization_code',
				code: code,
				redirect_uri: `https://nubbot.ngrok.io/forward`,
				client_id: this.config.client.id,
				client_secret: this.config.client.secret,
			})
		});
	}

	_handleUrl(event) {
		const query = qs.parse(`?${event.url.split('?').slice(1)}`);
		this._getToken(query.code);
		Linking.removeEventListener('url', this._boundListener);
	}
}

