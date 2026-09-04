(function(){
  const STORAGE_KEY = 'udemy-board-notes';
  const CATEGORY_KEY = 'udemy-board-categories';
  const DEFAULT_CATEGORIES = ['プログラミング','デザイン','語学','ビジネス','その他'];

  function loadEntries(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    }catch(e){ return []; }
  }
  function saveEntries(entries){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  function loadCategories(){
    try{
      const raw = localStorage.getItem(CATEGORY_KEY);
      const stored = raw ? JSON.parse(raw) : null;
      if(Array.isArray(stored) && stored.length){
        return stored;
      }
    }catch(e){ /* fall through to defaults */ }
    return [...DEFAULT_CATEGORIES];
  }
  function saveCategories(){
    localStorage.setItem(CATEGORY_KEY, JSON.stringify(categories));
  }
  function addCategory(name){
    const trimmed = name.trim();
    if(!trimmed) return trimmed;
    if(!categories.includes(trimmed)){
      categories.push(trimmed);
      saveCategories();
    }
    return trimmed;
  }

  let entries = loadEntries();
  let categories = loadCategories();
  let activeCategory = 'すべて';
  let editingId = null;
  let expandedIds = new Set(); 

  const form = document.getElementById('entry-form');
  const titleInput = document.getElementById('f-title');
  const urlInput = document.getElementById('f-url');
  const memoInput = document.getElementById('f-memo');
  const categorySelect = document.getElementById('f-category');
  const categoryNewInput = document.getElementById('f-category-new');
  const catToggleBtn = document.getElementById('cat-toggle-btn');
  const errTitle = document.getElementById('err-title');
  const errUrl = document.getElementById('err-url');
  const entryList = document.getElementById('entry-list');
  const categoryFilters = document.getElementById('category-filters');
  const searchInput = document.getElementById('search-input');
  const countTotal = document.getElementById('count-total');
  const resetBtn = document.getElementById('reset-btn');

  function getAllCategories(){
    const fromEntries = entries.map(e => e.category).filter(Boolean);
    let changed = false;
    fromEntries.forEach(c => {
      if(!categories.includes(c)){
        categories.push(c);
        changed = true;
      }
    });
    if(changed) saveCategories();
    return categories;
  }

  function renderCategorySelect(){
    const cats = getAllCategories();
    const current = categorySelect.value;
    categorySelect.innerHTML = '<option value="">選択してください</option>' +
      cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    if(cats.includes(current)) categorySelect.value = current;
  }

  catToggleBtn.addEventListener('click', () => {
    const showingNew = categoryNewInput.style.display === 'block';
    if(showingNew){
      categoryNewInput.style.display = 'none';
      categorySelect.style.display = 'block';
      catToggleBtn.textContent = '新規';
    } else {
      categoryNewInput.style.display = 'block';
      categorySelect.style.display = 'none';
      catToggleBtn.textContent = '一覧から選ぶ';
      categoryNewInput.focus();
    }
  });

  function escapeHtml(str){
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function isValidUrl(str){
    try{
      const u = new URL(str);
      return u.protocol === 'http:' || u.protocol === 'https:';
    }catch(e){ return false; }
  }

  function resetForm(){
    form.reset();
    categoryNewInput.style.display = 'none';
    categorySelect.style.display = 'block';
    catToggleBtn.textContent = '新規';
    errTitle.style.display = 'none';
    errUrl.style.display = 'none';
    renderCategorySelect();
  }

  resetBtn.addEventListener('click', resetForm);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let valid = true;
    const title = titleInput.value.trim();
    const url = urlInput.value.trim();

    if(!title){
      errTitle.style.display = 'block';
      valid = false;
    } else {
      errTitle.style.display = 'none';
    }

    if(!url || !isValidUrl(url)){
      errUrl.style.display = 'block';
      valid = false;
    } else {
      errUrl.style.display = 'none';
    }

    if(!valid) return;

    const category = (categoryNewInput.style.display === 'block' ? addCategory(categoryNewInput.value) : categorySelect.value.trim()) || 'その他';
    const memo = memoInput.value.trim();

    entries.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2,7),
      title, url, memo, category,
      createdAt: new Date().toISOString()
    });

    saveEntries(entries);
    resetForm();
    render();
  });

  function handleEnterSubmit(e) {
    if(e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
  }
  titleInput.addEventListener('keydown', handleEnterSubmit);
  memoInput.addEventListener('keydown', handleEnterSubmit);

  function editEntry(id){
    editingId = id;
    render();
  }

  function saveInlineEdit(id, values){
    const idx = entries.findIndex(en => en.id === id);
    if(idx !== -1){
      entries[idx] = { ...entries[idx], ...values };
    }
    saveEntries(entries);
    editingId = null;
    render();
  }

  function cancelInlineEdit(){
    editingId = null;
    render();
  }

  function toggleDetails(id){
    if(expandedIds.has(id)) expandedIds.delete(id);
    else expandedIds.add(id);
    render();
  }

  function deleteEntry(id){
    if(!confirm('この項目を削除しますか？')) return;
    entries = entries.filter(e => e.id !== id);
    saveEntries(entries);
    render();
  }

  function renderFilters(){
    const cats = getAllCategories();
    const all = ['すべて', ...cats];
    categoryFilters.innerHTML = all.map(c =>
      `<button type="button" class="chip ${c === activeCategory ? 'active' : ''}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`
    ).join('');

    categoryFilters.querySelectorAll('.chip[data-cat]').forEach(btn => {
      btn.addEventListener('click', () => {
        activeCategory = btn.dataset.cat;
        render();
      });
    });
  }

  function render(){
    renderCategorySelect();
    renderFilters();

    const q = searchInput.value.trim().toLowerCase();
    let filtered = entries.filter(e => {
      const matchesCat = activeCategory === 'すべて' || e.category === activeCategory;
      const matchesQ = !q || e.title.toLowerCase().includes(q) || (e.memo || '').toLowerCase().includes(q);
      return matchesCat && matchesQ;
    });

    countTotal.textContent = entries.length;

    if(filtered.length === 0){
      entryList.innerHTML = `
        <div class="empty-state">
          <p class="big">${entries.length === 0 ? 'まだノートがありません' : '該当するノートが見つかりません'}</p>
          <p>${entries.length === 0 ? '上のフォームからUdemyの板書ドキュメントを追加してください。' : '検索条件やカテゴリを変えてみてください。'}</p>
        </div>`;
      return;
    }

    entryList.innerHTML = filtered.map(e => {
      if(e.id === editingId){
        const cats = getAllCategories();
        return `
      <div class="card entry entry-editing" data-id="${e.id}">
        <div class="edit-row">
          <textarea class="edit-title" placeholder="講座名・板書タイトル" rows="1">${escapeHtml(e.title)}</textarea>
          <select class="edit-category">
            ${cats.map(c => `<option value="${escapeHtml(c)}" ${c === e.category ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
          </select>
        </div>
        <div class="edit-row">
          <input type="url" class="edit-url" value="${escapeHtml(e.url)}" placeholder="GoogleドキュメントURL">
        </div>
        <div class="edit-row">
          <textarea class="edit-memo" placeholder="メモ（任意）">${escapeHtml(e.memo || '')}</textarea>
        </div>
        <span class="error-msg edit-error">タイトルと正しいURLを入力してください</span>
        <div class="edit-actions">
          <button type="button" class="btn-ghost edit-cancel-btn">キャンセル</button>
          <button type="button" class="btn-primary edit-save-btn">保存する</button>
        </div>
      </div>`;
      }
      
      // ★ここでタイトルを改行で分割します
      const titleLines = e.title.split('\n');
      const mainTitle = titleLines[0]; // 1行目
      const subTitle = titleLines.slice(1).join('\n'); // 2行目以降

      return `
      <div class="card entry" data-id="${e.id}">
        <div class="entry-main">
          <span class="entry-eyebrow-cat">${escapeHtml(e.category)}</span>
          <p class="entry-title ${expandedIds.has(e.id) ? 'is-open' : ''}"><a href="${escapeHtml(e.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(mainTitle)}</a></p>
          ${subTitle ? `<div class="entry-subtitle ${expandedIds.has(e.id) ? 'is-open' : ''}">${escapeHtml(subTitle)}</div>` : ''}
          ${e.memo ? `<p class="entry-memo ${expandedIds.has(e.id) ? 'is-open' : ''}">${escapeHtml(e.memo)}</p>` : ''}
        </div>
        <div class="entry-bottom">
          <div class="entry-actions">
            <button type="button" class="icon-btn edit-btn">編集</button>
            <button type="button" class="icon-btn delete delete-btn">削除</button>
          </div>
          <button type="button" class="details-toggle ${expandedIds.has(e.id) ? 'is-open' : ''}" aria-expanded="${expandedIds.has(e.id)}" title="詳細を表示">▾</button>
        </div>
      </div>`;
    }).join('');

    entryList.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => editEntry(e.target.closest('.entry').dataset.id));
    });
    entryList.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => deleteEntry(e.target.closest('.entry').dataset.id));
    });
    
    entryList.querySelectorAll('.details-toggle').forEach(btn => {
      const row = btn.closest('.entry');
      btn.classList.add('is-visible');
      btn.addEventListener('click', (e) => toggleDetails(row.dataset.id));
    });

    entryList.querySelectorAll('.edit-cancel-btn').forEach(btn => {
      btn.addEventListener('click', cancelInlineEdit);
    });

    entryList.querySelectorAll('.edit-title, .edit-memo').forEach(el => {
      el.addEventListener('keydown', (e) => {
        if(e.key === 'Enter' && !e.shiftKey && !e.isComposing){
          e.preventDefault();
          const btn = e.target.closest('.entry').querySelector('.edit-save-btn');
          if(btn) btn.click();
        }
      });
    });

    entryList.querySelectorAll('.edit-save-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const row = e.target.closest('.entry');
        const id = row.dataset.id;
        const title = row.querySelector('.edit-title').value.trim();
        const url = row.querySelector('.edit-url').value.trim();
        const category = row.querySelector('.edit-category').value;
        const memo = row.querySelector('.edit-memo').value.trim();
        const errEl = row.querySelector('.edit-error');
        if(!title || !url || !isValidUrl(url)){
          errEl.style.display = 'block';
          return;
        }
        errEl.style.display = 'none';
        saveInlineEdit(id, { title, url, category, memo });
      });
    });
  }

  searchInput.addEventListener('input', render);

  document.getElementById('export-btn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `udemy-board-notes-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const imported = JSON.parse(reader.result);
        if(!Array.isArray(imported)) throw new Error('invalid');
        const existingIds = new Set(entries.map(en => en.id));
        const merged = [...entries];
        imported.forEach(en => {
          if(en && en.id && !existingIds.has(en.id)){
            merged.push(en);
          }
        });
        entries = merged.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
        saveEntries(entries);
        render();
        alert('読み込みが完了しました。');
      }catch(err){
        alert('ファイルの読み込みに失敗しました。正しいバックアップファイルか確認してください。');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  render();
})();