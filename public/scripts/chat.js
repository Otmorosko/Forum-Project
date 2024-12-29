import { monitorAuthState } from './auth.js';

const socket = io('https://chubby-mirrors-matter.loca.lt');

const messagesDiv = document.getElementById('messages');
const form = document.getElementById('form');
const input = document.getElementById('input');

monitorAuthState((user) => {
    if (!user) {
        alert('Musisz być zalogowany, aby korzystać z czatu.');
        return;
    }

    const userName = user.displayName || 'Nieznany użytkownik';

    socket.on('chat history', (history) => {
        messagesDiv.innerHTML = '';
        history.forEach((msg) => {
            const item = document.createElement('li');
            item.textContent = `[${new Date(msg.timestamp).toLocaleTimeString()}] ${msg.author}: ${msg.text}`;
            messagesDiv.appendChild(item);
        });
    });

    socket.on('chat message', (msg) => {
        const item = document.createElement('li');
        item.textContent = `[${new Date(msg.timestamp).toLocaleTimeString()}] ${msg.author}: ${msg.text}`;
        messagesDiv.appendChild(item);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (input.value) {
            const message = { text: input.value, author: userName };
            console.log('Wysyłanie wiadomości:', message);
            socket.emit('chat message', message);
            input.value = '';
        }
    });
});
