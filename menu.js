// Updated JavaScript - menu.js
function menuInit() {

    const menuIcon = $('<div id="menu-icon">&#8801;</div>'),
        menuPopup = $('<div id="menu-popup" class="sm sm-clean"></div>');




    // Menu Data Structure
    const menuData = [
        {
            title: 'File',
            submenu: [
                { title: 'Load', action: () => { } },
                { title: 'Share', action: () => { } }
            ]
        },
        {
            title: '[+]',
            submenu: [
                { title: 'Text', action: () => console.log("Add Text Node") },
                { title: 'Rich Text', action: () => console.log("Add Rich Text Node") },
                { title: 'Image/Multimedia', action: () => console.log("Add Image/Multimedia Node") },
                { title: 'Interactive', action: () => console.log("Add Interactive Node") },
                { title: '...', action: () => console.log("Add ...") }
            ]
        },
        {
            title: 'Layout',
            submenu: [
                { title: 'Force-Directed', action: () => console.log("Force-Directed layout") },
                { title: 'Circular', action: () => console.log("Circular layout") },
                { title: 'Hierarchical', action: () => console.log("Hierarchical layout") },
                { title: 'Grid', action: () => console.log("Grid layout") }
            ]
        }
    ];

    // Function to build menu items using SmartMenus structure
    function buildMenuItem(itemData) {
        const item = $('<li>').append($('<a>').text(itemData.title));

        if (itemData.action) {
            item.children('a').on('click', itemData.action);
        }

        if (itemData.submenu) {
            const submenu = $('<ul>');
            itemData.submenu.forEach(subItemData => submenu.append(buildMenuItem(subItemData)));
            item.append(submenu);
        }

        return item;
    }

    // Building the menu from data
    const mainMenu = menuPopup;
    menuData.forEach(itemData => mainMenu.append(buildMenuItem(itemData)));

    // Initialize SmartMenus
    mainMenu.smartmenus({
        showOnClick: true,  // Show submenus only on click
        hideOnClick: true,   // Hide submenus when clicked outside
        clickActivated: true, // Activate all menu levels on click
        showTimeout: 0,  // Show submenu immediately
        hideTimeout: 0,   // Hide submenu immediately
        noMouseOver: true
    });

    function hideMenu() { menuPopup.removeClass('show'); }
    menuIcon.on('click', () => menuPopup.toggleClass('show'));

    $(document).on('click', e =>
        !$(e.target).closest('#menu-icon, #menu-popup').length && hideMenu()
    );

    $('body').prepend(menuIcon, menuPopup);
}
