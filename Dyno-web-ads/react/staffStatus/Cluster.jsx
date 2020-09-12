import axios from 'axios';
import React from 'react';
import ReactTooltip from 'react-tooltip';
import { Menu, Item, MenuProvider } from 'react-contexify';
import '!style-loader!css-loader!react-contexify/dist/ReactContexify.min.css';

export default class Cluster extends React.Component {
	number_format = (number) => number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

	handleRestart = async () => {
		const id = this.props.data.id;
		if (!id) {
			return;
		}

		try {
			await axios.post(`/api/status/restart`, {
				server: this.props.server.toLowerCase(),
				id,
			});
			window.alert(`Restarting ${this.props.server} cluster ${id}.`);
		} catch (err) {
			console.error(err);
			window.alert('Something went wrong. See the console for more information.');
		}
	}

	render() {
		let data = this.props.data;
		let serverInitial = this.props.server[0];
		let shards;
		let color = 'success';
		let problems = [];
		let extrainfo;

		if (data.error) {
			if (data.error === 'Redis call failed.') {
				color = 'ipc-timeout';
				problems.push(`${data.error} Please wait a few minutes and try again.`);
			} else {
				color = 'error';
				problems.push(`${data.error} Please try again later.`);
			}

			if (data.guessedShards) {
				shards = `#${data.guessedShards[0]} - #${data.guessedShards[5]}`;
			} else {
				shards = `Error`;
			}
		} else {
			let first = data.result.shards[0], last = data.result.shards[data.result.shards.length - 1];
			shards = `#${first} - #${last}`;
			if (data.result.unavailableCount > 0) {
				if (data.result.unavailableCount > 10) {
					color = 'warning';
				}
				problems.push(this.number_format(data.result.unavailableCount) + ' guild(s) unavailable');
			}
			if (data.result.connectedCount < 6) {
				if (data.result.connectedCount < 3) {
					color = 'error';
				} else {
					color = 'warning';
				}
				problems.push(this.number_format((6 - data.result.connectedCount)) + ' shard(s) unavailable');
			}

			extrainfo = (<div>
				<p>Uptime: {data.result.uptime}</p>
				<p>{this.number_format(data.result.guildCount)} guilds</p>
				<p>{this.number_format(data.result.voiceConnections)} voice connections</p>
			</div>);
		}
		if (problems.length) {
			problems = problems.join(', ');
		} else {
			problems = 'No issues';
		}
		let clusterId = serverInitial + data.id;
		let highlight = this.props.highlight ? ' shadow-highlight' : '';

		const StaffMenu = (
			<Menu id={`staff-menu-${clusterId}`} theme='dark' animation='zoom'>
				<Item onClick={this.handleRestart}>Restart {clusterId}</Item>
			</Menu>
		);

		return (
			<div>
				<MenuProvider id={`staff-menu-${clusterId}`} event='onContextMenu'>
					<div onClick={(ev) => { ReactTooltip.show(ev.target) }} data-tip data-for={`clusterStatus${clusterId}`} className={`cluster bg-${color}${highlight}`}>
						{clusterId}
					</div>
				</MenuProvider>
				<ReactTooltip id={`clusterStatus${clusterId}`} type={color === 'ipc-timeout' ? 'dark' : color} effect='solid'>
					<h5 className={'title is-5'}>Cluster {clusterId}</h5>
					<p>Shards: {shards}</p>
					<p><strong>{problems}</strong></p>
					{extrainfo}
				</ReactTooltip>
				{StaffMenu}
			</div>);
	}
}
