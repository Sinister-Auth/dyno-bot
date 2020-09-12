import React from 'react';
import axios from 'axios';
import { createReactionRoles, editReactionRoles, deleteReactionRoles } from './service/reactionRolesService.js';
import ReactionSelector from './ReactionSelector.jsx';
import RichSelect from '../common/RichSelect.jsx';

export default class ReactionRolesPanel extends React.Component {
	state = {
		reactions: [],
		description: '',
		title: '',
		name: '',
		selectedChannel: false,
	};

	componentWillMount() {
		const msg = this.props.message;

		if (!msg) return;

		const { title, description, name } = msg;

		const channel = msg.channel;
		const selectedChannel = { value: channel.id, label: channel.name };

		const reactions = msg.roles.map((r) => {
			const emoji = Object.assign({}, r);
			delete emoji.roleId;

			let role = this.props.roles.find((rol) => rol.id === r.roleId);
			role = { name: role.name, value: role.id };

			const description = r.description;
			return { emoji, role, description };
		});

		this.setState({
			selectedChannel,
			title, name, description,
			reactions,
		});
	}

	async save() {
		const payload = {
			name: this.state.name,
			title: this.state.title,
			description: this.state.description,
			channel: this.state.selectedChannel.value,
			reactions: this.state.reactions,
		}

		const url = '/api/server/' + server + '/reactionRoles/create';
		try {
			const result = await axios.post(url, payload);
			_showSuccess(`Added Reaction Role ${payload.name}`);
			return result.data || result || {};
		} catch (err) {
			return _showError('Something went wrong.');
		}
	}

	handleDescription(event) {
		this.setState({ description: event.target.value });
	}

	handleName(event) {
		this.setState({ name: event.target.value });
	}

	handleTitle(event) {
		this.setState({ title: event.target.value });
	}

	handleChannel = (props, selectedChannel) => {
		const mappedMessages = [...messages].map(m => {
			return Object.assign({}, m, {
				channel: channels.find(c => c.id === m.channel)
			});
		});
		this.setState({ selectedChannel });
	}

	addReaction() {
		const reactions = [...this.state.reactions, { id: this.state.reactions.length > 0 ? this.state.reactions[this.state.reactions.length - 1].id + 1 : 0, emoji: '', role: '' }];
		this.setState({ reactions });
	}

	onEmojiChange(id, emoji) {
		const newReactions = this.state.reactions.map((r) => {
			if (r.id === id) {
				return { id, emoji, role: r.role, description: r.description };
			}
			return r;
		});
		this.setState({ reactions: newReactions });
	}

	onDescriptionChange(id, description) {
		const newReactions = this.state.reactions.map((r) => {
			if (r.id === id) {
				return { id, emoji: r.emoji, role: r.role, description };
			}
			return r;
		});
		this.setState({ reactions: newReactions });
	}

	onRoleChange(id, role) {
		const newReactions = this.state.reactions.map((r) => {
			if (r.id === id) {
				return { id, emoji: r.emoji, role, description: r.description };
			}
			return r;
		});
		this.setState({ reactions: newReactions });
	}

	createEmbed = async (embed) => {
		let { message, selectedChannel } = this.state;
		message.embed = embed;
		message.channel = selectedChannel.value || false;
		try {
			const result = await createMessageEmbed(message);
			message = result.message || message;
			await this.setState({ message });
			if (this.props.onSave) {
				this.props.onSave(message);
			}
		} catch (err) {
			return;
		}
	}

	editReaction = async (embed) => {
		let { message } = this.state;
		message.embed = embed;
		message.channel = message.channel ? message.channel.id || message.channel : false;
		await this.setState({ message });
		await editMessageEmbed(message);
		if (this.props.onSave) {
			this.props.onSave(message);
		}
	}

	deleteReaction = async (embed) => {
		let { message } = this.state;
		this.setState({ message: this.defaultMessage, selectedChannel: false });
		deleteMessageEmbed(message);
		if (this.props.onDelete) {
			this.props.onDelete(message);
		}
	}

	cancelReaction = async () => {
		this.setState({ message: this.defaultMessage, selectedChannel: false });
		if (this.props.onCancel) {
			this.props.onCancel();
		}
	}

	render() {
		const { message, selectedChannel } = this.state;
		const { roles } = this.props;
		const channels = this.props.channels.filter(c => c.type === 0);
		const channelOptions = channels.map(c => ({ value: c.id, label: c.name }));

		return (<div className='message-embedder'>
			<div className='settings-content is-flex'>
				<h3 className='title is-5'>Message Settings</h3>
				<div className='control rich-select'>
					<label className='label' htmlFor='author-name'>
						<label className='label'>Name</label>
						<input id='name'
							className='input is-expanded'
							type='text'
							placeholder='Give it a unique name'
							value={this.state.name}
							onChange={this.handleName.bind(this)} />
					</label>
				</div>
				<RichSelect
					text='Channel'
					defaultValue={false}
					defaultOption='Select Channel'
					options={channelOptions}
					disabled={false}
					onChange={this.handleChannel} />
				<div className='control'>
					<label className='label'>Title</label>
					<input id='name'
						className='input is-expanded'
						type='text'
						placeholder='Give it a nice title'
						value={this.state.title}
						onChange={this.handleTitle.bind(this)} />
					<label className='label'>Description</label>
					<textarea
						className='input'
						name='description'
						onChange={this.handleDescription.bind(this)}
						value={this.state.description}
						maxLength={200}
					/>
				</div>
			</div>
			<div className='settings-content'>
				<h3 className='title is-5'>Message</h3>

				{this.state.reactions.map((r, i) => (
					<ReactionSelector
						emojis={this.props.emojis}
						roles={this.props.roles}
						emoji={r.emoji}
						role={r.role}
						onEmojiChange={this.onEmojiChange.bind(this)}
						onDescriptionChange={this.onDescriptionChange.bind(this)}
						onRoleChange={this.onRoleChange.bind(this)}
						id={r.id}
						key={i}
					/>
				))}
				<button className='button is-info' onClick={this.addReaction.bind(this)}>Add Reaction</button>
				<div className='control'>
					<button className='button is-info' onClick={this.save.bind(this)}>Save</button>
				</div>
			</div>
		</div >);
	};
}
