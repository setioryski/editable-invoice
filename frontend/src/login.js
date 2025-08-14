import './login.css';

document.getElementById('login-form').addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const username = this.username.value;
    const password = this.password.value;
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        if (response.ok) {
            // Login successful, the server will create a session.
            // Redirect to the invoice page.
            window.location.href = '/invoice.html';
        } else {
            // Login failed
            const data = await response.json();
            alert(data.message || 'Invalid username or password');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('An error occurred during login. Please try again.');
    }
});