import './login.css';

document.getElementById('login-form').addEventListener('submit', function(event) {
    event.preventDefault();
    
    const username = this.username.value;
    const password = this.password.value;
    
    // Hardcoded credentials
    if (username === 'admin' && password === 'admin') {
        window.location.href = '/invoice.html';
    } else {
        alert('Invalid username or password');
    }
});