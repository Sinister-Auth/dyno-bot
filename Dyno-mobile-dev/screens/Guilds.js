import React, { Component } from 'react';
import styles from '../styles.js';
import { Container, List, ListItem, Left, Content, Right, Thumbnail, Body, Icon, Text } from 'native-base';
import { LocalStorage } from '../db';


export class Guilds extends Component {
	constructor() {
		super();
		this.storage = new LocalStorage();
	}

	goToGuild = (guild) => {
		this.props.navigator.push({
			screen: 'dyno.Guild',
			title: guild.name,
			passProps: {
				guild: guild
			},
            navigatorButtons: {
                leftButtons: [{
                    id: 'sideMenu'
                }]
            },
			backButtonHidden: true
		});
	}


	render() {

        let guildsData = [
            { key: "1", name: "Dyno™", memberCount: '68754', id: "1", icon: "https://images-ext-2.discordapp.net/external/R2oCqyq2QU1QaDcD1pEOl6KDJqVU-2yHStbmq_TsnyU/https/discordapp.com/api/guilds/203039963636301824/icons/95daafe34f4e57af0cee7e40bf757513.jpg?width=60&height=60" },
            { key: "2", name: "Guild 2", memberCount: '470', id: "2", icon: "https://images-ext-1.discordapp.net/external/lRCuK-i7U28qmfVeJ0tI3fnkFe3MWmSLC6wBDOSyOP0/%3Fsize%3D128/https/cdn.discordapp.com/icons/292012705387249666/bc50f630382c834bee82870d41c48245.png" },
            { key: "3", name: "TEST GUILD", memberCount: '53', id: "3", icon: "https://images-ext-1.discordapp.net/external/_MczctPkDsQG1ooSVHnv0rCVGO_l0pkoetXq5gfdygs/https/discordapp.com/api/guilds/279973285507366913/icons/5415d95b6ae55beded7f0bd0358be82a.jpg?width=60&height=60" },
            { key: "4", name: "Long Giuild name hi how are you my name is chip", memberCount: '25', id: "4", icon: "https://cdn.discordapp.com/icons/332863398104793089/4ef9c878b298e9778df98c3786bf29c8.png?size=128" },
            { key: "5", name: "Guild 5", memberCount: '19387424', id: "5", icon: "https://images-ext-1.discordapp.net/external/joFHz3OijBfbOLUd1tuvvJxMNKWQ5KRyoR8NDVscruA/https/discordapp.com/api/guilds/278299625042083840/icons/73501912fd2d794ae659c356e54f5d8e.jpg" },
            { key: "6", name: "h", memberCount: '24', id: "6", icon: "https://images-ext-1.discordapp.net/external/3G7MLwm2uC0yaDuaOqebNpMcyQGVg-2NrYaMr9-pXO4/https/discordapp.com/api/guilds/425051568207953920/icons/cb335decf9c32b6105c7439d1d282d16.jpg" }, 
        ];

		guildsData = guildsData.map(g => {
			let guild = {
				key: g.key,
				id: g.id,
				name: g.name,
				memberCount: g.memberCount,
				icon: g.icon
			}
			return guild;
		});
		return (
			<Container style={styles.defaultbackground}>
				<Content>
					<List dataArray={guildsData}
						renderRow={(item) =>
							<ListItem button onPress={() => this.goToGuild(item)}>
									<Left>
										<Thumbnail source={{ uri: item.icon }} />
									</Left>
									<Body>
										<Text style={styles.text}>{item.name}</Text>
									</Body>
									<Right>
										<Icon name="arrow-forward" />
									</Right>
							</ListItem>
						}>
					</List>
				</Content>
			</Container>
		);
	}

	async getGuilds() {
		let guilds = await this.storage.get("guilds");
		return JSON.stringify(guilds);
	}
}
