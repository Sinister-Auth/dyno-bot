export const AndroidApp = {
    screen: {
        screen: 'dyno.Home',
        title: 'Home',
        navigatorButtons: {
            leftButtons: [{
                id: 'sideMenu'
            }]
        }
    },
    appStyle: {
        orientation: 'portrait',
    },
    drawer: {
        left: {
            screen: 'dyno.LeftDrawer',
            fixedWidth: 300
        },
        style: {
            drawerShadow: true
        }
    }, 
};