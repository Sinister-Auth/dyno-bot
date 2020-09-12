import { StyleSheet } from 'react-native';
export default styles = StyleSheet.create({
    fullContainer: {
        width: '100%',
        height: '100%'
    },
    container: {
        flex: 1,
        backgroundColor: '#333',
        alignItems: 'center',
        justifyContent: 'center',
    },
    backgroundImage: {
        flex: 1,
        resizeMode: 'center'
    },
    guildsButton: {
        padding: 10,
        fontSize: 18,
        height: 44,
    },
    title: {
        fontSize: 25,
        color: '#ffffff',
        fontFamily: 'sans-serif-light',
        fontWeight: 'bold'
    },
    header: {
        backgroundColor: '#333'
    },
    text: {
        color: '#ffffff',
        fontFamily: 'sans-serif-light',
    },
    background: {
        backgroundColor: '#333',
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    drawer: {
        backgroundColor: '#333',
        // alignItems: 'center',
        // justifyContent: 'center'
    },
    guild: {
        flex: 1,
        maxWidth: '100%',
        maxHeight: '100%'
    },
    defaultbackground: {
        backgroundColor: '#333'
    },
    headerContainer: {
        backgroundColor: '#1a1a1a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    mainContainer: {
        backgroundColor: '#333',
        flex: 1
    },
    guildName: {
        maxWidth: 150,
        overflow: 'hidden',
        paddingTop: 25,
        fontSize: 25,
        fontWeight: 'bold',
        textAlignVertical: 'center',
    },
    memberCount: {
        fontSize: 20,
        margin: 15
    },
    guildIcon: {
        width: 75,
        height: 75,
        marginTop: 15
    },
    serverInfo: {
        backgroundColor: '#1a1a1a',
        alignItems: 'center',
    },
    premium: {
        backgroundColor: '#d16900',
        borderRadius: 20,
    },
    premiumText: {
        fontWeight: 'bold',
        fontSize: 14
    },
    modules: {
        height: 200,
        width: '100%'
    },
    tos: {
        // left: '1%', when enabling this, it pushes text off the screen
        flex: 1,
        backgroundColor: '#333',
    },
    deep1: {
        left: 10,
    },
    deep2: {
        left: 25
    },
});