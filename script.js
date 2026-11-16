(function () {
  'use strict';

  const itemsBody = document.getElementById('items-body');
  const addButton = document.getElementById('add-item');
  const grandTotal = document.getElementById('grand-total');
  const dateInput = document.getElementById('estimate-date');
  const numberInput = document.querySelector('[name="estimate-number"]');
  const commentInput = document.getElementById('estimate-comment');
  const printNumber = document.getElementById('print-number');
  const printDate = document.getElementById('print-date');
  const savePdfButton = document.getElementById('save-pdf');

  const numberFormat = new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  });

  function todayAsLocalDate() {
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 10);
  }

  function readNumber(value) {
    const normalized = String(value ?? '').trim().replace(/\s/g, '').replace(',', '.');
    if (!normalized || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return 0;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  function formatMoney(value) {
    const safeValue = Number.isFinite(value) && value > 0 ? value : 0;
    return numberFormat.format(safeValue) + ' ₸';
  }

  function formatDocumentDate(value) {
    if (!value) return '—';
    const parts = value.split('-');
    if (parts.length !== 3) return '—';
    return parts[2] + '.' + parts[1] + '.' + parts[0];
  }

  function updatePrintHeading() {
    printNumber.textContent = numberInput.value.trim() || '—';
    printDate.textContent = formatDocumentDate(dateInput.value);
  }

  function makeCell(label, className) {
    const cell = document.createElement('td');
    cell.dataset.label = label;
    cell.className = className;
    return cell;
  }

  function makeTextInput(label, placeholder, className) {
    const input = document.createElement('input');
    input.className = 'item-input ' + className;
    input.type = 'text';
    input.placeholder = placeholder || '';
    input.setAttribute('aria-label', label);
    input.autocomplete = 'off';
    return input;
  }

  function addItem(focusName) {
    const row = document.createElement('tr');
    row.className = 'item-row';

    const nameCell = makeCell('Наименование', 'name-cell');
    const nameInput = makeTextInput('Наименование позиции', 'Например, консультация', 'name-input');
    nameCell.append(nameInput);

    const quantityCell = makeCell('Количество', 'quantity-cell');
    const quantityInput = makeTextInput('Количество', '0', 'numeric-input quantity-input');
    quantityInput.inputMode = 'decimal';
    quantityCell.append(quantityInput);

    const unitCell = makeCell('Единица', 'unit-cell');
    const unitSelect = document.createElement('select');
    unitSelect.className = 'item-unit';
    unitSelect.setAttribute('aria-label', 'Единица измерения');
    ['шт', 'час', 'услуга'].forEach(function (unit) {
      const option = document.createElement('option');
      option.value = unit;
      option.textContent = unit;
      unitSelect.append(option);
    });
    unitCell.append(unitSelect);

    const priceCell = makeCell('Цена', 'price-cell');
    const priceInput = makeTextInput('Цена за единицу в тенге', '0', 'numeric-input price-input');
    priceInput.inputMode = 'decimal';
    priceCell.append(priceInput);

    const amountCell = makeCell('Сумма строки', 'amount-cell');
    const amount = document.createElement('output');
    amount.className = 'line-total';
    amount.textContent = formatMoney(0);
    amountCell.append(amount);

    const removeCell = makeCell('Удалить позицию', 'remove-cell');
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'remove-button';
    removeButton.textContent = '✕';
    removeButton.setAttribute('aria-label', 'Удалить позицию');
    removeCell.append(removeButton);

    row.append(nameCell, quantityCell, unitCell, priceCell, amountCell, removeCell);
    itemsBody.append(row);

    if (focusName) nameInput.focus();
  }

  function recalculate() {
    let total = 0;
    itemsBody.querySelectorAll('.item-row').forEach(function (row) {
      const quantity = readNumber(row.querySelector('.quantity-input').value);
      const price = readNumber(row.querySelector('.price-input').value);
      const lineTotal = quantity * price;
      const safeLineTotal = Number.isFinite(lineTotal) ? lineTotal : 0;
      row.querySelector('.line-total').textContent = formatMoney(safeLineTotal);
      total += safeLineTotal;
    });
    grandTotal.textContent = formatMoney(Number.isFinite(total) ? total : 0);
  }

  addButton.addEventListener('click', function () { addItem(true); });

  itemsBody.addEventListener('input', function (event) {
    if (event.target.matches('.quantity-input, .price-input')) recalculate();
  });

  itemsBody.addEventListener('change', function (event) {
    if (event.target.matches('.quantity-input, .price-input')) recalculate();
  });

  itemsBody.addEventListener('click', function (event) {
    const removeButton = event.target.closest('.remove-button');
    if (!removeButton) return;
    removeButton.closest('.item-row').remove();
    if (itemsBody.querySelectorAll('.item-row').length === 0) addItem(false);
    recalculate();
  });

  itemsBody.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter') return;
    const row = event.target.closest('.item-row');
    const rows = itemsBody.querySelectorAll('.item-row');
    if (row && row === rows[rows.length - 1]) {
      event.preventDefault();
      addItem(true);
    }
  });

  dateInput.value = todayAsLocalDate();
  numberInput.addEventListener('input', updatePrintHeading);
  dateInput.addEventListener('input', updatePrintHeading);
  savePdfButton.addEventListener('click', function () { window.print(); });
  document.getElementById('estimate-form').addEventListener('submit', function (event) { event.preventDefault(); });
  commentInput.addEventListener('input', function () {
    commentInput.style.height = 'auto';
    commentInput.style.height = Math.max(commentInput.scrollHeight, 100) + 'px';
  });
  updatePrintHeading();
  addItem(false);
  recalculate();
}());
