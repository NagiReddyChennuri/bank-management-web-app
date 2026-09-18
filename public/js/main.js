/**
 * Apex Bank — Frontend Application Logic
 * Private Customer Session, Instant Transactions, and Landing Page Management
 */

document.addEventListener('DOMContentLoaded', () => {
    // Current Active User State in Browser Session
    let currentUser = JSON.parse(sessionStorage.getItem('apex_current_user') || 'null');
    let isBalanceHidden = false;

    // UI Elements - Views
    const landingView = document.getElementById('landing-view');
    const dashboardView = document.getElementById('dashboard-view');
    const guestNav = document.getElementById('guest-nav');
    const userNav = document.getElementById('user-nav');
    const alertBox = document.getElementById('alert-box');

    // Modals
    const loginModal = document.getElementById('login-modal');
    const registerModal = document.getElementById('register-modal');

    // Forms
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const depositForm = document.getElementById('dash-deposit-form');
    const withdrawForm = document.getElementById('dash-withdraw-form');
    const transferForm = document.getElementById('dash-transfer-form');
    const profileForm = document.getElementById('dash-profile-form');

    // Dashboard Elements
    const dashGreeting = document.getElementById('dash-greeting');
    const dashAccNumber = document.getElementById('dash-acc-number');
    const dashBalance = document.getElementById('dash-balance');
    const dashEmail = document.getElementById('dash-email');
    const userNavName = document.getElementById('user-nav-name');
    const userNavAcc = document.getElementById('user-nav-acc');
    const userAvatarInitial = document.getElementById('user-avatar-initial');
    const myTransactionsBody = document.getElementById('my-transactions-body');

    // Currency Formatter (INR ₹)
    function formatINR(amount) {
        return '₹' + Number(amount || 0).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    // Display Alert / Toast Notification
    function showAlert(message, type = 'success') {
        alertBox.className = `toast-alert ${type}`;
        alertBox.textContent = message;
        alertBox.classList.remove('hidden');

        setTimeout(() => {
            alertBox.classList.add('hidden');
        }, 4000);
    }

    // ----------------------------------------------------
    // 1. Session & View Controller
    // ----------------------------------------------------
    function renderAppView() {
        if (currentUser && currentUser.account_number) {
            // Logged in: Show Private Customer Dashboard
            landingView.classList.add('hidden');
            dashboardView.classList.remove('hidden');
            guestNav.classList.add('hidden');
            userNav.classList.remove('hidden');

            userNavName.textContent = currentUser.holder_name;
            userNavAcc.textContent = currentUser.account_number;
            userAvatarInitial.textContent = (currentUser.holder_name || 'U').charAt(0).toUpperCase();

            dashGreeting.textContent = `Welcome back, ${currentUser.holder_name}!`;
            dashAccNumber.textContent = currentUser.account_number;
            dashEmail.textContent = currentUser.email;

            // Fill settings inputs
            document.getElementById('edit-holder-name').value = currentUser.holder_name;
            document.getElementById('edit-email').value = currentUser.email;

            updateBalanceDisplay();
            loadMyTransactions();
        } else {
            // Logged out: Show Public Landing Page
            landingView.classList.remove('hidden');
            dashboardView.classList.add('hidden');
            guestNav.classList.remove('hidden');
            userNav.classList.add('hidden');
        }
    }

    function updateBalanceDisplay() {
        if (isBalanceHidden) {
            dashBalance.textContent = '••••••••';
        } else {
            dashBalance.textContent = formatINR(currentUser.balance);
        }
    }

    // Toggle Balance Visibility
    document.getElementById('toggle-balance-btn').addEventListener('click', () => {
        isBalanceHidden = !isBalanceHidden;
        updateBalanceDisplay();
    });

    // Copy Account Number
    document.getElementById('copy-acc-btn').addEventListener('click', () => {
        if (currentUser && currentUser.account_number) {
            navigator.clipboard.writeText(currentUser.account_number);
            showAlert(`Copied Account Number: ${currentUser.account_number}`, 'success');
        }
    });

    // ----------------------------------------------------
    // 2. Fetch Latest Account Details
    // ----------------------------------------------------
    async function refreshAccountData() {
        if (!currentUser || !currentUser.account_number) return;

        try {
            const res = await fetch(`/api/accounts/me/${currentUser.account_number}`);
            const data = await res.json();

            if (res.ok && data.success) {
                currentUser = data.data;
                sessionStorage.setItem('apex_current_user', JSON.stringify(currentUser));
                updateBalanceDisplay();
            }
        } catch (err) {
            console.error('Failed to sync account balance:', err);
        }
    }

    // ----------------------------------------------------
    // 3. Load Logged-In User's Transactions / Passbook
    // ----------------------------------------------------
    async function loadMyTransactions() {
        if (!currentUser || !currentUser.account_number) return;

        myTransactionsBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Loading your transactions...</td></tr>';

        try {
            const res = await fetch(`/api/transactions/${currentUser.account_number}`);
            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Could not load statement');
            }

            const txs = data.transactions;
            if (!txs || txs.length === 0) {
                myTransactionsBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No transactions found. Make a deposit to get started!</td></tr>';
                return;
            }

            myTransactionsBody.innerHTML = txs.map(t => {
                const isCredit = t.type === 'DEPOSIT';
                const formattedDate = new Date(t.created_at).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                });

                let badgeClass = 'badge-deposit';
                let sign = '+';
                let amountClass = 'tx-amount-plus';

                if (t.type === 'WITHDRAWAL') {
                    badgeClass = 'badge-withdrawal';
                    sign = '-';
                    amountClass = 'tx-amount-minus';
                } else if (t.type === 'TRANSFER') {
                    badgeClass = 'badge-transfer';
                    sign = '-';
                    amountClass = 'tx-amount-minus';
                }

                return `
                    <tr>
                        <td><small>${formattedDate}</small></td>
                        <td><span class="badge-tx ${badgeClass}">${t.type}</span></td>
                        <td>${escapeHtml(t.description || '-')}</td>
                        <td class="text-right ${amountClass}">${sign}${formatINR(t.amount)}</td>
                    </tr>
                `;
            }).join('');
        } catch (err) {
            myTransactionsBody.innerHTML = `<tr><td colspan="4" class="text-center" style="color:#ef4444;">${err.message}</td></tr>`;
        }
    }

    // ----------------------------------------------------
    // 4. Authentication (Sign In, Open Account, Logout)
    // ----------------------------------------------------

    // Open Login Modal
    function openLoginModal() {
        loginModal.classList.remove('hidden');
        registerModal.classList.add('hidden');
    }

    // Open Register Modal
    function openRegisterModal() {
        registerModal.classList.remove('hidden');
        loginModal.classList.add('hidden');
    }

    document.getElementById('nav-login-btn').addEventListener('click', openLoginModal);
    document.getElementById('hero-login-btn').addEventListener('click', openLoginModal);
    document.getElementById('nav-register-btn').addEventListener('click', openRegisterModal);
    document.getElementById('hero-open-btn').addEventListener('click', openRegisterModal);
    document.getElementById('security-open-btn').addEventListener('click', openRegisterModal);

    document.getElementById('close-login-btn').addEventListener('click', () => loginModal.classList.add('hidden'));
    document.getElementById('close-register-btn').addEventListener('click', () => registerModal.classList.add('hidden'));

    document.getElementById('switch-to-register').addEventListener('click', (e) => {
        e.preventDefault();
        openRegisterModal();
    });

    document.getElementById('switch-to-login').addEventListener('click', (e) => {
        e.preventDefault();
        openLoginModal();
    });

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target === loginModal) loginModal.classList.add('hidden');
        if (e.target === registerModal) registerModal.classList.add('hidden');
    });

    // Handle Login Submit
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const identifier = document.getElementById('login-identifier').value.trim();
        const pin = document.getElementById('login-pin').value.trim();

        try {
            const res = await fetch('/api/accounts/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, pin })
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Authentication failed');

            currentUser = result.data;
            sessionStorage.setItem('apex_current_user', JSON.stringify(currentUser));
            loginModal.classList.add('hidden');
            loginForm.reset();

            showAlert(`Welcome, ${currentUser.holder_name}!`, 'success');
            renderAppView();
        } catch (err) {
            showAlert(err.message, 'error');
        }
    });

    // Handle Open Account Submit
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const holderName = document.getElementById('reg-holder-name').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const pin = document.getElementById('reg-pin').value.trim();
        const initialDeposit = document.getElementById('reg-deposit').value;

        try {
            const res = await fetch('/api/accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    holder_name: holderName,
                    email: email,
                    pin: pin,
                    initial_deposit: initialDeposit
                })
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Failed to open account');

            currentUser = result.data;
            sessionStorage.setItem('apex_current_user', JSON.stringify(currentUser));
            registerModal.classList.add('hidden');
            registerForm.reset();

            showAlert(result.message, 'success');
            renderAppView();
        } catch (err) {
            showAlert(err.message, 'error');
        }
    });

    // Handle Logout
    document.getElementById('logout-btn').addEventListener('click', () => {
        sessionStorage.removeItem('apex_current_user');
        currentUser = null;
        showAlert('You have been securely signed out.', 'success');
        renderAppView();
    });

    // ----------------------------------------------------
    // 5. Customer Dashboard Operations
    // ----------------------------------------------------

    // Tab Switcher
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const targetPaneId = btn.getAttribute('data-tab');
            document.getElementById(targetPaneId).classList.add('active');
        });
    });

    // Handle Deposit
    depositForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = document.getElementById('deposit-amount').value;
        const description = document.getElementById('deposit-desc').value;
        const pin = document.getElementById('deposit-pin').value.trim();

        try {
            const res = await fetch('/api/transactions/deposit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    account_number: currentUser.account_number,
                    amount,
                    description,
                    pin
                })
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Deposit failed');

            showAlert(result.message, 'success');
            depositForm.reset();
            await refreshAccountData();
            loadMyTransactions();
        } catch (err) {
            showAlert(err.message, 'error');
        }
    });

    // Handle Withdraw
    withdrawForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = document.getElementById('withdraw-amount').value;
        const description = document.getElementById('withdraw-desc').value;
        const pin = document.getElementById('withdraw-pin').value.trim();

        try {
            const res = await fetch('/api/transactions/withdraw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    account_number: currentUser.account_number,
                    amount,
                    description,
                    pin
                })
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Withdrawal failed');

            showAlert(result.message, 'success');
            withdrawForm.reset();
            await refreshAccountData();
            loadMyTransactions();
        } catch (err) {
            showAlert(err.message, 'error');
        }
    });

    // Handle Transfer
    transferForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const recipient = document.getElementById('transfer-recipient').value.trim();
        const amount = document.getElementById('transfer-amount').value;
        const description = document.getElementById('transfer-desc').value;
        const pin = document.getElementById('transfer-pin').value.trim();

        try {
            const res = await fetch('/api/transactions/transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sender_account_number: currentUser.account_number,
                    receiver_account_number: recipient,
                    amount,
                    description,
                    pin
                })
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Transfer failed');

            showAlert(result.message, 'success');
            transferForm.reset();
            await refreshAccountData();
            loadMyTransactions();
        } catch (err) {
            showAlert(err.message, 'error');
        }
    });

    // Handle Settings / Profile Update
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const holder_name = document.getElementById('edit-holder-name').value.trim();
        const email = document.getElementById('edit-email').value.trim();
        const current_pin = document.getElementById('edit-current-pin').value.trim();
        const new_pin = document.getElementById('edit-new-pin').value.trim();

        try {
            const payload = { holder_name, email, current_pin };
            if (new_pin) payload.new_pin = new_pin;

            const res = await fetch(`/api/accounts/${currentUser.account_number}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Failed to update profile');

            showAlert(result.message, 'success');
            document.getElementById('edit-current-pin').value = '';
            document.getElementById('edit-new-pin').value = '';
            await refreshAccountData();
            renderAppView();
        } catch (err) {
            showAlert(err.message, 'error');
        }
    });

    // Refresh Passbook Button
    document.getElementById('refresh-statement-btn').addEventListener('click', () => {
        refreshAccountData();
        loadMyTransactions();
        showAlert('Passbook updated!', 'success');
    });

    // Reset / Clear Database (Utility)
    document.getElementById('clear-data-btn').addEventListener('click', async () => {
        const confirmClear = confirm('⚠️ Are you sure you want to delete all accounts and transactions from the database? This action cannot be undone.');
        if (!confirmClear) return;

        try {
            const res = await fetch('/api/accounts/clear-all-data', { method: 'POST' });
            const result = await res.json();

            if (!res.ok) throw new Error(result.error || 'Failed to clear data');

            sessionStorage.removeItem('apex_current_user');
            currentUser = null;
            showAlert('All database records cleared successfully.', 'success');
            renderAppView();
        } catch (err) {
            showAlert(err.message, 'error');
        }
    });

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Initialize View
    renderAppView();
});