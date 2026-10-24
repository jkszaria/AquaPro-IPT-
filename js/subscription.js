        document.addEventListener('DOMContentLoaded', function() {
            const user = AquaStore.requireRole(['customer'], 'login.html');
            if (!user) return;
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('delivery-date').setAttribute('min', today);
            document.getElementById('delivery-date').value = today;
            document.getElementById('time-slot').value = 'morning';
            updateSummary();
            loadSavedPreferences();
            const saved = AquaStore.getSubscriptions()[user.email];
            if (saved) {
                const preferenceRadio = document.querySelector(`input[name="deliveryPreference"][value="${saved.preference}"]`);
                if (preferenceRadio) preferenceRadio.checked = true;
                if (saved.frequency) {
                    const frequency = document.querySelector(`input[name="frequency"][value="${saved.frequency}"]`);
                    if (frequency) frequency.checked = true;
                    document.getElementById('frequencySection').style.display = 'block';
                    if (saved.frequency === 'custom') {
                        document.getElementById('customDaysGroup').style.display = 'block';
                        const dayInputs = document.querySelectorAll('#customDaysGroup input[type="checkbox"]');
                        for (let i = 0; i < dayInputs.length; i++) {
                            const dayName = dayInputs[i].closest('label').textContent.trim();
                            dayInputs[i].checked = saved.days && saved.days.indexOf(dayName) !== -1;
                        }
                    }
                }
            }
        });

        // Quantity
        function changeQty(product, delta) {
            const input = document.getElementById('qty-' + product);
            let val = parseInt(input.value) || 0;
            val += delta;
            if (val < 0) val = 0;
            if (val > 10) val = 10;
            input.value = val;
            updateSummary();
        }

        // Update summary
        function updateSummary() {
            const slimQuantity = parseInt(document.getElementById('qty-slim').value) || 0;
            const roundQuantity = parseInt(document.getElementById('qty-round').value) || 0;
            const bottleQuantity = parseInt(document.getElementById('qty-bottle').value) || 0;
            const subtotal = (slimQuantity * 25) + (roundQuantity * 30) + (bottleQuantity * 35);
            const dfee = subtotal > 0 ? AquaStore.getDeliveryFee() : 0;
            const total = subtotal + dfee;

            let html = '';
            if (slimQuantity > 0) html += `<div class="summary-item"><span class="item-name">${slimQuantity}x Slim Container</span><span class="item-price">₱${(slimQuantity * 25).toFixed(2)}</span></div>`;
            if (roundQuantity > 0) html += `<div class="summary-item"><span class="item-name">${roundQuantity}x Round Container</span><span class="item-price">₱${(roundQuantity * 30).toFixed(2)}</span></div>`;
            if (bottleQuantity > 0) html += `<div class="summary-item"><span class="item-name">${bottleQuantity}x 5-Gallon Bottle</span><span class="item-price">₱${(bottleQuantity * 35).toFixed(2)}</span></div>`;
            
            document.getElementById('summary-items').innerHTML = html || '<p class="empty-cart">No items selected yet</p>';
            document.getElementById('subtotal').textContent = '₱' + subtotal.toFixed(2);
            document.getElementById('delivery-fee').textContent = '₱' + dfee.toFixed(2);
            document.getElementById('total').textContent = '₱' + total.toFixed(2);
        }

        document.getElementById('time-slot').addEventListener('change', updateSummary);
        document.getElementById('delivery-date').addEventListener('change', updateSummary);

        // Scheduled toggle
        document.getElementById('scheduledRadio').addEventListener('change', function() {
            document.getElementById('frequencySection').style.display = 'block';
        });
        document.querySelector('input[value="one-time"]').addEventListener('change', function() {
            document.getElementById('frequencySection').style.display = 'none';
            document.getElementById('customDaysGroup').style.display = 'none';
        });

        // Frequency custom
        const frequencyInputs = document.querySelectorAll('input[name="frequency"]');
        for (let i = 0; i < frequencyInputs.length; i++) {
            frequencyInputs[i].addEventListener('change', function() {
                const customDays = document.getElementById('customDaysGroup');
                customDays.style.display = document.getElementById('customFreqRadio').checked ? 'block' : 'none';
            });
        }

        // Reminder
        function updateReminderUI() {
            const on = document.getElementById('reminderToggle').checked;
            document.getElementById('reminderPreset').disabled = !on;
            if (!on) {
                document.getElementById('customReminderGroup').style.display = 'none';
            } else if (document.getElementById('reminderPreset').value === 'custom') {
                document.getElementById('customReminderGroup').style.display = 'flex';
            } else {
                document.getElementById('customReminderGroup').style.display = 'none';
            }
        }
        document.getElementById('reminderToggle').addEventListener('change', updateReminderUI);
        document.getElementById('reminderPreset').addEventListener('change', updateReminderUI);

        function loadSavedPreferences() {
            const saved = JSON.parse(localStorage.getItem('aquapro_reminder_preferences'));
            if (saved) {
                document.getElementById('reminderToggle').checked = saved.reminderEnabled;
                if (saved.isCustom) {
                    document.getElementById('reminderPreset').value = 'custom';
                    document.getElementById('customReminderValue').value = saved.customValue;
                    document.getElementById('customReminderUnit').value = saved.customUnit;
                } else {
                    document.getElementById('reminderPreset').value = saved.reminderInterval;
                }
                updateReminderUI();
            }
        }

        // ====== PLACE ORDER ======
        function placeOrder() {
            const slimQuantity = parseInt(document.getElementById('qty-slim').value) || 0;
            const roundQuantity = parseInt(document.getElementById('qty-round').value) || 0;
            const bottleQuantity = parseInt(document.getElementById('qty-bottle').value) || 0;
            const date = document.getElementById('delivery-date').value;
            const timeSlot = document.getElementById('time-slot').value;
            const instructions = document.getElementById('instructions').value;
            const preference = document.querySelector('input[name="deliveryPreference"]:checked').value;
            
            const subtotal = (slimQuantity * 25) + (roundQuantity * 30) + (bottleQuantity * 35);
            const dfee = subtotal > 0 ? AquaStore.getDeliveryFee() : 0;
            const total = subtotal + dfee;
            if (!slimQuantity && !roundQuantity && !bottleQuantity) {
                AquaStore.toast('Select at least one product before placing your order.', 'error');
                return;
            }
            if (!date || date < document.getElementById('delivery-date').min) {
                AquaStore.toast('Choose a valid delivery date.', 'error');
                return;
            }
            const frequencyInput = document.querySelector('input[name="frequency"]:checked');
            const frequency = frequencyInput ? frequencyInput.value : 'weekly';
            const selectedDays = [];
            const checkedDays = document.querySelectorAll('#customDaysGroup input:checked');
            for (let i = 0; i < checkedDays.length; i++) {
                selectedDays.push(checkedDays[i].closest('label').textContent.trim());
            }
            if (preference === 'scheduled' && frequency === 'custom' && !selectedDays.length) {
                AquaStore.toast('Choose at least one day for your custom schedule.', 'error');
                return;
            }

            const timeLabels = { morning: 'Morning (8:00 AM - 12:00 PM)', afternoon: 'Afternoon (12:00 PM - 5:00 PM)' };
            const user = AquaStore.getCurrentUser();
            const items = [];
            if (slimQuantity > 0) items.push({ name: 'Slim Container', quantity: slimQuantity, price: 25 });
            if (roundQuantity > 0) items.push({ name: 'Round Container', quantity: roundQuantity, price: 30 });
            if (bottleQuantity > 0) items.push({ name: '5-Gallon Bottle', quantity: bottleQuantity, price: 35 });
            const order = AquaStore.createOrder({
                email: user.email,
                customer: user.name,
                phone: user.phone || '',
                barangay: user.barangay || '',
                address: user.address || '',
                items,
                subtotal,
                deliveryFee: dfee,
                total,
                date,
                timeSlot,
                instructions,
                status: 'pending',
                driverEmail: '',
                payment: 'Cash on Delivery',
                createdAt: new Date().toISOString()
            });

            let dateFormatted = date;
            if (date) {
                const d = new Date(date + 'T00:00:00');
                dateFormatted = d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            }

            let itemSummary = '';
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                itemSummary += `<p>${item.quantity}x ${item.name} — ₱${(item.quantity * item.price).toFixed(2)}</p>`;
            }

            localStorage.setItem('aquapro_reminder_preferences', JSON.stringify({
                reminderEnabled: document.getElementById('reminderToggle').checked,
                reminderInterval: document.getElementById('reminderPreset').value,
                isCustom: document.getElementById('reminderPreset').value === 'custom',
                customValue: document.getElementById('customReminderValue').value,
                customUnit: document.getElementById('customReminderUnit').value
            }));

            let freqText = '';
            if (preference === 'scheduled') {
                const labels = { weekly: 'Weekly', biweekly: 'Every 2 weeks', monthly: 'Monthly', custom: 'Custom Days' };
                freqText = `<p><strong>Frequency:</strong> ${labels[frequency] || frequency}</p>`;
                const subscriptions = AquaStore.getSubscriptions();
                subscriptions[user.email] = { active: true, frequency, days: selectedDays, preference, orderId: order.id };
                AquaStore.saveSubscriptions(subscriptions);
            } else {
                const subscriptions = AquaStore.getSubscriptions();
                if (subscriptions[user.email]) {
                    subscriptions[user.email].active = false;
                    subscriptions[user.email].preference = preference;
                    AquaStore.saveSubscriptions(subscriptions);
                }
            }
            const content = `
                <div class="summary-block">
                    <h4>📦 Order Details</h4>
                    <p><strong>Order Number:</strong> #${order.id}</p>
                    <p><strong>Date:</strong> ${dateFormatted}</p>
                    <p><strong>Time Slot:</strong> ${timeLabels[timeSlot] || timeSlot}</p>
                </div>
                <div class="summary-block">
                    <h4>🛒 Items Ordered</h4>
                    ${itemSummary}
                </div>
                <div class="summary-block">
                    <h4>💰 Payment Summary</h4>
                    <p>Subtotal: <strong>₱${subtotal.toFixed(2)}</strong></p>
                    <p>Delivery Fee: <strong>₱${dfee.toFixed(2)}</strong></p>
                    <p style="font-size:16px; margin-top:6px;">Total: <strong>₱${total.toFixed(2)}</strong></p>
                </div>
                <div class="summary-block">
                    <h4>⚙️ Delivery Preference</h4>
                    <p><strong>${preference === 'scheduled' ? '🔄 Scheduled Delivery' : '📋 One-Time Order'}</strong></p>
                    ${freqText}
                    <p>${document.getElementById('reminderToggle').checked ? '🔔 Reminder: ON' : '🔕 Reminder: OFF'}</p>
                </div>
                ${instructions ? `<div class="summary-block"><h4>📝 Special Instructions</h4><p>${escapeHTML(instructions)}</p></div>` : ''}
            `;

            document.getElementById('modalContent').innerHTML = content;
            document.getElementById('orderModal').classList.add('active');
        }

        function closeModal() {
            document.getElementById('orderModal').classList.remove('active');
            window.location.href = 'order-history.html';
        }

        function escapeHTML(value) {
            const replacements = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            };
            return String(value).replace(/[&<>"']/g, function(character) {
                return replacements[character];
            });
        }

        document.getElementById('orderModal').addEventListener('click', function(e) {
            if (e.target === this) closeModal();
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') closeModal();
        });

        updateReminderUI();
