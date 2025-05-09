const buttons = document.querySelectorAll('.button');
const menus = document.querySelectorAll('.menu');

const highlight = document.createElement('span');
document.body.appendChild(highlight);
highlight.classList.add('highlight');

// Set initial dimensions and position of 'highlight' based on activeButton coords 
function initialHightlightLocation() {
    const activeButton = document.querySelector('.button--is-active');
    if (!activeButton) {
        return;
    }
    const activeButtonCoords = activeButton.getBoundingClientRect();

    const initialCoords = {
        width: activeButtonCoords.width,
        height: activeButtonCoords.height,
        left: activeButtonCoords.left + window.scrollX,
        top: activeButtonCoords.top + window.scrollY
    }

    highlight.style.width = `${initialCoords.width}px`;
    highlight.style.height = `${initialCoords.height}px`;
    highlight.style.transform = `translate(${initialCoords.left}px, ${initialCoords.top}px)`;
}

function handleClick(e) {
    e.preventDefault();

    buttons.forEach(button => button.classList.remove('button--is-active'));
    this.classList.add('button--is-active');

    // Set current dimensions and position of 'highlight' based on the clicked button 
    const buttonCoords = this.getBoundingClientRect();
    const coords = {
        width: buttonCoords.width,
        height: buttonCoords.height,
        left: buttonCoords.left + window.scrollX,
        top: buttonCoords.top + window.scrollY
    }
    highlight.style.width = `${coords.width}px`;
    highlight.style.height = `${coords.height}px`;
    highlight.style.transform = `translate(${coords.left}px, ${coords.top}px)`;

    // Show the menu associated to the clicked button
    const targetMenu = document.querySelector(`#${this.dataset.target}`);
    menus.forEach(menu => {
        menu.classList.remove('menu--is-visible');
        targetMenu.classList.add('menu--is-visible');
    })
}

window.addEventListener('load', initialHightlightLocation);
window.addEventListener('resize', initialHightlightLocation);
buttons.forEach(button => button.addEventListener('click', handleClick));

const orderButtons = document.querySelectorAll('.order-button-icon');
orderButtons.forEach(button => {
    const cocktailIdent = button.getAttribute('cocktailIdent');
    button.addEventListener('click', async () => {
        await fetch(`/bestellung/${cocktailIdent}`, { method: 'POST' });
    })
});

const deleteOrderButtons = document.querySelectorAll('.delete-order-button');
deleteOrderButtons.forEach(button => {
    const cocktailIdent = button.getAttribute('cocktailIdent');
    button.addEventListener('click', async () => {
        console.log('CLICK')
        await fetch(`/bestellung/delete/${cocktailIdent}`, { method: 'POST' });
    });
});

setButtonEvent('login-button', (button) => {
    const redirect = button.getAttribute('redirect');
    window.location.replace(`/login${redirect ? `?redirect=${redirect}` : ''}`);
});
setButtonEvent('logout-button', (button) => {
    const redirect = button.getAttribute('redirect');
    window.location.replace(`/logout${redirect ? `?redirect=${redirect}` : ''}`)
});
setButtonEvent('cocktail-create-button', () => {
    redirect('/cocktails');
});
setButtonEvent('cocktails-button', () => {
    redirect('/');
});
setButtonEvent('bestellung-button', () => {
    redirect('/bestellung');
});

function setButtonEvent(buttonClassName, btnFnc) {
    const button = document.querySelector(`.${buttonClassName}`);
    button?.addEventListener('click', () => btnFnc(button));
}

function redirect(location) {
    window.location.replace(location);
}

const orderButtonIcons = document.querySelectorAll('.order-button-icon');
for (const orderButtonIcon of orderButtonIcons) {
    orderButtonIcon.addEventListener('click', () => {
        orderButtonIcon.classList.add('bouncing');
        setTimeout(() => {
            orderButtonIcon.classList.remove('bouncing');
        }, 500);
    });
}