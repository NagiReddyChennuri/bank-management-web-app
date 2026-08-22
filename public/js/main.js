document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    const alertBox = document.getElementById('alert-box');
    const createForm = document.getElementById('create-account-form');
    const txForm = document.getElementById('transaction-form');
    const txAccountSelect = document.getElementById('tx-account');
    const txSubmitBtn = document.getElementById('tx-submit-btn');
    const txTypeRadios = document.getElementsByName('tx-type');
    const accountsTableBody = document.getElementById('accounts-table-body');
    const refreshBtn = document.getElementById('refresh-btn');
    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');

    // KPI Elements
    const kpiLiquidity = document.getElementById('kpi-liquidity');
    const kpiAccounts = document.getElementById('kpi-accounts');
    const kpiDeposits = document.getElementById('kpi-deposits');
    const kpiWithdrawals = document.getElementById('kpi-withdrawals');

    // Statement Modal Elements
    const statementModal = document.getElementById('statement-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const modalTitle = document.getElementById('modal-title');
    const modalAccountInfo = document.getElementById('modal-account-info');
    const statementTableBody = document.getElementById('statement-table-body');

    // Edit Modal Elements
    const editModal = document.getElementById('edit-modal');
    const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
    const editForm = document.getElementById('edit-account-form');
    const editAccountNo = document.getElementById('edit-account-number');
    const editAccountNoDisplay = document.getElementById('edit-account-number-display');
    const editHolderName = document.getElementById('edit-holder-name');
    const editEmail = document.getElementById('edit-email');
    const editPin = document.getElementById('edit-pin');

    let rawAccounts = [];

    // Currency Formatter (INR ₹)
    function formatINR(amount) {
        return '₹' + Number(amount || 0).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    // Display alert
    function showAlert(message, type = 'success') {
        alertBox.className = `alert ${type}`;
        alertBox.textContent = message;
        alertBox.classList.remove('hidden');

        setTimeout(() => {
            alertBox.classList.add('hidden');
        }, 4500);
    }

    // 1. Health check
    async function checkHealth() {
        try {
            const res = await fetch('/api/health');
            if (res.ok) {
                statusDot.className = 'dot online';
                statusText.textContent = 'Server Online';
            } else {
                throw new Error();
            }
        } catch {
            statusDot.className = 'dot offline';
            statusText.textContent = 'Server Offline';
        }
    }

    // 2. Fetch Analytics KPIs
    async function loadAnalytics() {
        try {
            const res = await fetch('/api/analytics');
            const data = await res.json();

            if (res.ok && data.success) {
                const stats = data.data;
                kpiLiquidity.textContent = formatINR(stats.total_liquidity);
                kpiAccounts.textContent = stats.total_accounts;
                kpiDeposits.textContent = formatINR(stats.total_deposited);
                kpiWithdrawals.textContent = formatINR(stats.total_withdrawn);
            }
        } catch (err) {
            console.error('Failed to load analytics:', err);
        }
    }

    // 3. Fetch Accounts
    async function loadAccounts() {
        try {
            const res = await fetch('/api/accounts');
            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to fetch accounts');
            }

            rawAccounts = data.data;
            updateAccountDropdown();
            renderFilteredAccounts();
        } catch (err) {
            accountsTableBody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center" style="color: #e53e3e;">Failed to load accounts: ${err.message}</td>
        </tr>
      `;
        }
    }

    // 4. Render Table with Filters
    function renderFilteredAccounts() {
        const query = searchInput.value.toLowerCase().trim();
        const sortBy = sortSelect.value;

        let filtered = rawAccounts.filter(acc =>
            acc.account_number.toLowerCase().includes(query) ||
            acc.holder_name.toLowerCase().includes(query) ||
            acc.email.toLowerCase().includes(query)
        );

        if (sortBy === 'balance-high') {
            filtered.sort((a, b) => b.balance - a.balance);
        } else if (sortBy === 'balance-low') {
            filtered.sort((a, b) => a.balance - b.balance);
        } else if (sortBy === 'name') {
            filtered.sort((a, b) => a.holder_name.localeCompare(b.holder_name));
        } else {
            filtered.sort((a, b) => b.id - a.id);
        }

        if (filtered.length === 0) {
            accountsTableBody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center text-muted">No matching accounts found.</td>
        </tr>
      `;
            return;
        }

        accountsTableBody.innerHTML = filtered.map(acc => `
      <tr>
        <td><span class="account-num-badge">${acc.account_number}</span></td>
        <td>
          <strong>${escapeHtml(acc.holder_name)}</strong><br>
          <small class="text-muted">${escapeHtml(acc.email)}</small>
        </td>
        <td class="balance-text">${formatINR(acc.balance)}</td>
        <td>
          <div class="action-btn-group">
            <button class="btn btn-outline btn-sm view-statement-btn" data-account="${acc.account_number}" data-name="${escapeHtml(acc.holder_name)}" title="View Statement">
              Statement
            </button>
            <button class="btn btn-outline btn-sm edit-account-btn" data-account="${acc.account_number}" data-name="${escapeHtml(acc.holder_name)}" data-email="${escapeHtml(acc.email)}" title="Edit Details">
              ✏️
            </button>
            <button class="btn btn-danger btn-sm delete-account-btn" data-account="${acc.account_number}" data-name="${escapeHtml(acc.holder_name)}" title="Close Account">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `).join('');

        attachRowListeners();
    }

    function attachRowListeners() {
        document.querySelectorAll('.view-statement-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const accNo = btn.getAttribute('data-account');
                const name = btn.getAttribute('data-name');
                openStatementModal(accNo, name);
            });
        });

        document.querySelectorAll('.edit-account-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const accNo = btn.getAttribute('data-account');
                const name = btn.getAttribute('data-name');
                const email = btn.getAttribute('data-email');
                openEditModal(accNo, name, email);
            });
        });

        document.querySelectorAll('.delete-account-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const accNo = btn.getAttribute('data-account');
                const name = btn.getAttribute('data-name');
                handleDeleteAccount(accNo, name);
            });
        });
    }

    function updateAccountDropdown() {
        const previousSelection = txAccountSelect.value;
        txAccountSelect.innerHTML = '<option value="">-- Choose an account --</option>';

        rawAccounts.forEach(acc => {
            const opt = document.createElement('option');
            opt.value = acc.account_number;
            opt.textContent = `${acc.account_number} - ${acc.holder_name} (${formatINR(acc.balance)})`;
            txAccountSelect.appendChild(opt);
        });

        if (previousSelection) {
            txAccountSelect.value = previousSelection;
        }
    }

    // 5. Handle Create Account with PIN
    createForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const holderName = document.getElementById('holder-name').value.trim();
        const email = document.getElementById('email').value.trim();
        const initialDeposit = document.getElementById('initial-deposit').value;
        const pin = document.getElementById('account-pin').value.trim();

        try {
            const res = await fetch('/api/accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    holder_name: holderName,
                    email: email,
                    initial_deposit: initialDeposit,
                    pin: pin
                })
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Could not create account');

            showAlert(`Account created successfully! ${result.data.account_number}`, 'success');
            createForm.reset();
            document.getElementById('initial-deposit').value = '5000.00';
            loadAccounts();
            loadAnalytics();
        } catch (err) {
            showAlert(err.message, 'error');
        }
    });

    // 6. Handle Button label on Transaction type toggle
    txTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'deposit') {
                txSubmitBtn.className = 'btn btn-success btn-block';
                txSubmitBtn.textContent = 'Authorize & Deposit';
            } else {
                txSubmitBtn.className = 'btn btn-danger btn-block';
                txSubmitBtn.textContent = 'Authorize & Withdraw';
            }
        });
    });

    // 7. Handle Deposit / Withdraw with PIN
    txForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const accountNumber = txAccountSelect.value;
        const amount = document.getElementById('tx-amount').value;
        const pin = document.getElementById('tx-pin').value.trim();
        const description = document.getElementById('tx-desc').value;
        const txType = document.querySelector('input[name="tx-type"]:checked').value;

        if (!accountNumber) {
            showAlert('Please select an account first.', 'error');
            return;
        }

        const endpoint = txType === 'deposit' ? '/api/transactions/deposit' : '/api/transactions/withdraw';

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    account_number: accountNumber,
                    amount: amount,
                    description: description,
                    pin: pin
                })
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Transaction failed');

            showAlert(result.message, 'success');
            document.getElementById('tx-amount').value = '';
            document.getElementById('tx-pin').value = '';
            document.getElementById('tx-desc').value = '';
            loadAccounts();
            loadAnalytics();
        } catch (err) {
            showAlert(err.message, 'error');
        }
    });

    // 8. Statement Modal
    async function openStatementModal(accountNumber, holderName) {
        modalTitle.textContent = `Statement: ${accountNumber}`;
        modalAccountInfo.textContent = `Account Holder: ${holderName}`;
        statementTableBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Loading transactions...</td></tr>';
        statementModal.classList.remove('hidden');

        try {
            const res = await fetch(`/api/transactions/${accountNumber}`);
            const data = await res.json();

            if (!res.ok || !data.success) throw new Error(data.error || 'Failed to fetch statement');

            const txs = data.transactions;

            if (txs.length === 0) {
                statementTableBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No transactions found.</td></tr>';
                return;
            }

            statementTableBody.innerHTML = txs.map(t => {
                const isDeposit = t.type === 'DEPOSIT';
                const formattedDate = new Date(t.created_at).toLocaleString('en-IN');
                return `
          <tr>
            <td><small>${formattedDate}</small></td>
            <td><span class="badge-tx ${isDeposit ? 'badge-deposit' : 'badge-withdrawal'}">${t.type}</span></td>
            <td>${escapeHtml(t.description || '-')}</td>
            <td class="${isDeposit ? 'tx-amount-plus' : 'tx-amount-minus'}">
              ${isDeposit ? '+' : '-'}${formatINR(t.amount)}
            </td>
          </tr>
        `;
            }).join('');
        } catch (err) {
            statementTableBody.innerHTML = `<tr><td colspan="4" class="text-center" style="color:#e53e3e;">${err.message}</td></tr>`;
        }
    }

    // 9. Edit Modal Logic with Old PIN Verification
    function openEditModal(accountNumber, holderName, email) {
        editAccountNo.value = accountNumber;
        editAccountNoDisplay.value = accountNumber;
        editHolderName.value = holderName;
        editEmail.value = email;

        // Clear PIN inputs
        document.getElementById('edit-current-pin').value = '';
        document.getElementById('edit-new-pin').value = '';
        document.getElementById('edit-confirm-pin').value = '';

        editModal.classList.remove('hidden');
    }

    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const accountNumber = editAccountNo.value;
        const holderName = editHolderName.value.trim();
        const email = editEmail.value.trim();
        const currentPin = document.getElementById('edit-current-pin').value.trim();
        const newPin = document.getElementById('edit-new-pin').value.trim();
        const confirmPin = document.getElementById('edit-confirm-pin').value.trim();

        // Frontend validation for new PIN
        if (newPin) {
            if (!/^\d{4}$/.test(newPin)) {
                showAlert('New PIN must be exactly 4 numeric digits.', 'error');
                return;
            }
            if (newPin !== confirmPin) {
                showAlert('New PIN and Confirm New PIN do not match.', 'error');
                return;
            }
        }

        try {
            const payload = {
                holder_name: holderName,
                email: email,
                current_pin: currentPin
            };

            if (newPin) {
                payload.new_pin = newPin;
            }

            const res = await fetch(`/api/accounts/${accountNumber}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Failed to update account');

            showAlert(result.message, 'success');
            editModal.classList.add('hidden');
            loadAccounts();
        } catch (err) {
            showAlert(err.message, 'error');
        }
    });

    // 10. Delete Account
    async function handleDeleteAccount(accountNumber, holderName) {
        const confirmed = confirm(`Are you sure you want to permanently close account ${accountNumber} (${holderName})?`);
        if (!confirmed) return;

        try {
            const res = await fetch(`/api/accounts/${accountNumber}`, {
                method: 'DELETE'
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Failed to delete account');

            showAlert(result.message, 'success');
            loadAccounts();
            loadAnalytics();
        } catch (err) {
            showAlert(err.message, 'error');
        }
    }

    searchInput.addEventListener('input', renderFilteredAccounts);
    sortSelect.addEventListener('change', renderFilteredAccounts);

    closeModalBtn.addEventListener('click', () => statementModal.classList.add('hidden'));
    closeEditModalBtn.addEventListener('click', () => editModal.classList.add('hidden'));

    window.addEventListener('click', (e) => {
        if (e.target === statementModal) statementModal.classList.add('hidden');
        if (e.target === editModal) editModal.classList.add('hidden');
    });

    refreshBtn.addEventListener('click', () => {
        loadAccounts();
        loadAnalytics();
    });

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    checkHealth();
    loadAnalytics();
    loadAccounts();
});