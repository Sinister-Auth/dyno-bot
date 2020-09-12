import React, { Component } from 'react';
import styles from '../styles.js';
import { Container, Header, Left, Button, Icon } from 'native-base';

export class Navbar extends Component {
    constructor() {
        super();
    }

    render() {
        return (
            <Container style={styles.background}>
                <Header>
                    <Left>
                        <Button
                            transparent
                            onPress={() => this.onPressButton()}>
                            <Icon name='menu' />
                        </Button>
                    </Left>
                </Header>
            </Container >
        );
    }
    onPressButton = () => {
        this.props.navigator.toggleDrawer({ 
            side: 'left',
            animated: true,
            to: 'missing'
        })
    }
}

