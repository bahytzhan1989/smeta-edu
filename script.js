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
  const estimateForm = document.getElementById('estimate-form');
  const fromInput = estimateForm.querySelector('[name="from"]');
  const toInput = estimateForm.querySelector('[name="to"]');
  const newEstimateButton = document.getElementById('new-estimate');
  const copyButton = document.getElementById('copy-whatsapp');
  const copyToast = document.getElementById('copy-toast');
  const copyFallback = document.getElementById('copy-fallback');
  const copyText = document.getElementById('copy-text');
  const storageKey = 'smeta-za-5-minut-draft-v1';
  let toastTimer;

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

  function addItem(focusName, values) {
    const row = document.createElement('tr');
    row.className = 'item-row';

    const nameCell = makeCell('Наименование', 'name-cell');
    const nameInput = makeTextInput('Наименование позиции', 'Например, консультация', 'name-input');
    nameInput.value = values && typeof values.name === 'string' ? values.name : '';
    nameCell.append(nameInput);

    const quantityCell = makeCell('Количество', 'quantity-cell');
    const quantityInput = makeTextInput('Количество', '0', 'numeric-input quantity-input');
    quantityInput.value = values && typeof values.quantity === 'string' ? values.quantity : '';
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
    if (values && ['шт', 'час', 'услуга'].includes(values.unit)) unitSelect.value = values.unit;
    unitCell.append(unitSelect);

    const priceCell = makeCell('Цена', 'price-cell');
    const priceInput = makeTextInput('Цена за единицу в тенге', '0', 'numeric-input price-input');
    priceInput.value = values && typeof values.price === 'string' ? values.price : '';
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

  function readDraft() {
    try {
      const rawDraft = localStorage.getItem(storageKey);
      if (!rawDraft) return null;
      const draft = JSON.parse(rawDraft);
      return draft && typeof draft === 'object' ? draft : null;
    } catch (error) {
      return null;
    }
  }

  function saveDraft() {
    const rows = Array.from(itemsBody.querySelectorAll('.item-row')).map(function (row) {
      return {
        name: row.querySelector('.name-input').value,
        quantity: row.querySelector('.quantity-input').value,
        unit: row.querySelector('.item-unit').value,
        price: row.querySelector('.price-input').value
      };
    });
    const draft = {
      from: fromInput.value,
      to: toInput.value,
      number: numberInput.value,
      date: dateInput.value,
      comment: commentInput.value,
      items: rows
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(draft));
    } catch (error) {
      // Storage may be unavailable in some browser privacy modes.
    }
  }

  function restoreDraft() {
    const draft = readDraft();
    if (!draft) return false;

    fromInput.value = typeof draft.from === 'string' ? draft.from : '';
    toInput.value = typeof draft.to === 'string' ? draft.to : '';
    numberInput.value = typeof draft.number === 'string' ? draft.number : '';
    dateInput.value = typeof draft.date === 'string' && draft.date ? draft.date : todayAsLocalDate();
    commentInput.value = typeof draft.comment === 'string' ? draft.comment : '';

    const storedItems = Array.isArray(draft.items) ? draft.items : [];
    if (storedItems.length) {
      storedItems.forEach(function (item) {
        addItem(false, item && typeof item === 'object' ? item : {});
      });
    } else {
      addItem(false);
    }
    return true;
  }

  function incrementNumber(value) {
    const current = String(value || '').trim();
    const match = current.match(/^(.*?)(\d+)$/);
    if (!match) return '1';
    const next = Number(match[2]) + 1;
    if (!Number.isFinite(next)) return '1';
    return match[1] + String(next).padStart(match[2].length, '0');
  }

  function makeWhatsAppText() {
    const lines = ['Смета № ' + (numberInput.value.trim() || '—') + ' от ' + formatDocumentDate(dateInput.value), ''];
    itemsBody.querySelectorAll('.item-row').forEach(function (row) {
      const name = row.querySelector('.name-input').value.trim();
      if (!name) return;
      const quantity = readNumber(row.querySelector('.quantity-input').value);
      const unit = row.querySelector('.item-unit').value;
      const price = readNumber(row.querySelector('.price-input').value);
      const lineTotal = quantity * price;
      lines.push('• ' + name + ' — ' + numberFormat.format(quantity) + ' ' + unit + ' × ' + formatMoney(price) + ' = ' + formatMoney(Number.isFinite(lineTotal) ? lineTotal : 0));
    });

    const optionalFields = [
      { selector: '[name="discount"], .discount-field input, .discount-field select', label: 'Скидка' },
      { selector: '[name="vat"], .vat-field input, .vat-field select', label: 'НДС' }
    ];
    optionalFields.forEach(function (item) {
      const field = document.querySelector(item.selector);
      if (field && String(field.value || '').trim()) lines.push(item.label + ': ' + String(field.value).trim());
    });

    lines.push('', 'Итого к оплате: ' + grandTotal.textContent);
    return lines.join('\n');
  }

  function showCopyToast() {
    copyFallback.hidden = true;
    copyToast.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { copyToast.hidden = true; }, 2000);
  }

  function showManualCopy(text) {
    copyToast.hidden = true;
    copyText.value = text;
    copyFallback.hidden = false;
    copyText.focus();
    copyText.select();
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

  addButton.addEventListener('click', function () {
    addItem(true);
    saveDraft();
  });

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
    saveDraft();
  });

  itemsBody.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter') return;
    const row = event.target.closest('.item-row');
    const rows = itemsBody.querySelectorAll('.item-row');
    if (row && row === rows[rows.length - 1]) {
      event.preventDefault();
      addItem(true);
      saveDraft();
    }
  });

  itemsBody.addEventListener('change', saveDraft);
  estimateForm.addEventListener('input', function () {
    updatePrintHeading();
    saveDraft();
  });
  estimateForm.addEventListener('change', function () {
    updatePrintHeading();
    saveDraft();
  });

  dateInput.value = todayAsLocalDate();
  numberInput.addEventListener('input', updatePrintHeading);
  dateInput.addEventListener('input', updatePrintHeading);
  savePdfButton.addEventListener('click', function () { window.print(); });
  estimateForm.addEventListener('submit', function (event) { event.preventDefault(); });
  newEstimateButton.addEventListener('click', function () {
    if (!window.confirm('Создать новую смету? Текущий черновик будет очищен.')) return;
    const nextNumber = incrementNumber(numberInput.value);
    fromInput.value = '';
    toInput.value = '';
    numberInput.value = nextNumber;
    dateInput.value = todayAsLocalDate();
    commentInput.value = '';
    itemsBody.replaceChildren();
    addItem(false);
    copyFallback.hidden = true;
    copyToast.hidden = true;
    updatePrintHeading();
    recalculate();
    saveDraft();
  });
  copyButton.addEventListener('click', async function () {
    const text = makeWhatsAppText();
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(text);
        showCopyToast();
        return;
      } catch (error) {
        // Fall through to the manual-copy field when clipboard access is denied.
      }
    }
    showManualCopy(text);
  });
  commentInput.addEventListener('input', function () {
    commentInput.style.height = 'auto';
    commentInput.style.height = Math.max(commentInput.scrollHeight, 100) + 'px';
  });
  updatePrintHeading();
  if (!restoreDraft()) addItem(false);
  recalculate();
  saveDraft();
}());
