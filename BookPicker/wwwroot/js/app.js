async function loadBooks() {
    try {
        const books = await fetchBooks();

        renderBooks(books);
        updateResultCount(books.length);
    } catch (error) {
        console.error("本の一覧を取得できませんでした。", error);
        showListMessage("本の一覧を取得できませんでした。時間をおいて再度お試しください。", "error");
        updateResultCount(null);
    }
}

const BOOKS_API_URL = "/api/books";
const DEFAULT_COVER_IMAGE_PATH = "/images/default-book-cover.png";

const bookList = document.getElementById("book-list");
const bookCardTemplate = document.getElementById("book-card-template");
const bookResultCount = document.getElementById("book-result-count");
const workspace = document.querySelector(".workspace");
const bookDetailPanel = document.getElementById("book-detail-panel");
const bookDetailContent = document.getElementById("book-detail-content");
const bookDetailCloseButton = document.getElementById("book-detail-close");
const bookDetailEditButton = document.getElementById("book-detail-edit");
const bookDetailCancelButton = document.getElementById("book-detail-cancel");

const GENRE_LABELS = {
    0: "未指定",
    1: "小説・文学",
    2: "ミステリー・推理",
    3: "SF",
    4: "ファンタジー",
    5: "恋愛・ロマンス",
    6: "ホラー・怪談",
    7: "歴史・時代小説",
    8: "ビジネス・経済",
    9: "自己啓発",
    10: "IT・技術書",
    11: "人文・思想・哲学",
    12: "歴史・地理",
    13: "科学・数学",
    14: "医学・健康",
    15: "語学・資格",
    16: "料理・レシピ",
    17: "芸術・アート・デザイン",
    18: "旅行・ガイドブック",
    19: "趣味・実用",
    20: "マンガ・コミック",
    21: "雑誌",
    22: "絵本・児童書",
    23: "ライトノベル",
    99: "その他"
};

const GENRE_NAME_LABELS = {
    None: "未指定",
    Fiction: "小説・文学",
    Mystery: "ミステリー・推理",
    SciFi: "SF",
    Fantasy: "ファンタジー",
    Romance: "恋愛・ロマンス",
    Horror: "ホラー・怪談",
    HistoricalFiction: "歴史・時代小説",
    Business: "ビジネス・経済",
    SelfHelp: "自己啓発",
    Technology: "IT・技術書",
    Humanities: "人文・思想・哲学",
    History: "歴史・地理",
    Science: "科学・数学",
    Health: "医学・健康",
    Education: "語学・資格",
    Cooking: "料理・レシピ",
    Art: "芸術・アート・デザイン",
    Travel: "旅行・ガイドブック",
    Hobby: "趣味・実用",
    Manga: "マンガ・コミック",
    Magazine: "雑誌",
    ChildrensBook: "絵本・児童書",
    LightNovel: "ライトノベル",
    Other: "その他"
};

const INTEREST_LEVEL_LABELS = {
    0: "興味なし",
    1: "少し興味あり",
    2: "興味あり",
    3: "とても興味あり",
    4: "最優先"
};

const INTEREST_LEVEL_NAME_LABELS = {
    NotInterested: "興味なし",
    SlightlyInterested: "少し興味あり",
    ModeratelyInterested: "興味あり",
    HighlyInterested: "とても興味あり",
    PrimaryInterest: "最優先"
};

let selectedBookId = null;
let bookDetailAbortController = null;
let currentBookDetail = null;
let editingBookId = null;
let editBookSnapshot = null;
let isSavingBook = false;

function getBookApiUrl(bookId) {
    return `${BOOKS_API_URL}/${encodeURIComponent(bookId)}`;
}

async function fetchBooks() {
    const response = await fetch(BOOKS_API_URL);

    if (!response.ok) {
        const error = new Error(`GET ${BOOKS_API_URL} failed: ${response.status}`);
        error.status = response.status;
        throw error;
    }

    const books = await response.json();

    if (!Array.isArray(books)) {
        throw new Error(`GET ${BOOKS_API_URL} returned an invalid response.`);
    }

    return books;
}

function getCoverImagePath(coverImagePath) {
    if (typeof coverImagePath !== "string" || coverImagePath.trim() === "") {
        return DEFAULT_COVER_IMAGE_PATH;
    }

    return coverImagePath.trim();
}

function calculateProgressPercentage(currentPage, totalPages) {
    const currentPageNumber = Number(currentPage);
    const totalPagesNumber = Number(totalPages);

    if (!Number.isFinite(currentPageNumber) || !Number.isFinite(totalPagesNumber) || totalPagesNumber <= 0) {
        return 0;
    }

    return Math.min(100, Math.max(0, (currentPageNumber / totalPagesNumber) * 100));
}

function getEnumLabel(value, numericLabels, nameLabels) {
    if (typeof value === "string") {
        const normalizedValue = value.trim();

        if (Object.hasOwn(nameLabels, normalizedValue)) {
            return nameLabels[normalizedValue];
        }

        if (normalizedValue !== "" && Object.hasOwn(numericLabels, normalizedValue)) {
            return numericLabels[normalizedValue];
        }
    }

    if (typeof value === "number" && Object.hasOwn(numericLabels, value)) {
        return numericLabels[value];
    }

    return "不明";
}

function getEnumNumericValue(value, numericLabels, nameLabels) {
    const normalizedValue = typeof value === "string" ? value.trim() : value;

    if ((typeof normalizedValue === "number" || normalizedValue !== "")
        && Object.hasOwn(numericLabels, normalizedValue)) {
        return Number(normalizedValue);
    }

    if (typeof normalizedValue === "string" && Object.hasOwn(nameLabels, normalizedValue)) {
        const label = nameLabels[normalizedValue];
        const numericEntry = Object.entries(numericLabels)
            .find(([, numericLabel]) => numericLabel === label);

        return numericEntry ? Number(numericEntry[0]) : null;
    }

    return null;
}

function formatLastReadAt(lastReadAt) {
    if (lastReadAt === null || lastReadAt === undefined || String(lastReadAt).trim() === "") {
        return "まだ読書記録がありません";
    }

    let utcDateTime = String(lastReadAt).trim();

    utcDateTime = utcDateTime.replace(/(\.\d{3})\d+/, "$1");

    if (!/(?:z|[+-]\d{2}:\d{2})$/i.test(utcDateTime)) {
        utcDateTime += "Z";
    }

    const date = new Date(utcDateTime);

    if (Number.isNaN(date.getTime())) {
        return "読書日時を表示できません";
    }

    return new Intl.DateTimeFormat("ja-JP", {
        dateStyle: "long",
        timeStyle: "short"
    }).format(date);
}

function createTextElement(tagName, className, text) {
    const element = document.createElement(tagName);

    if (className) {
        element.className = className;
    }

    element.textContent = text;
    return element;
}

function createMetadataItem(label, value, valueClassName = "") {
    const item = document.createElement("div");
    const term = createTextElement("dt", "", label);
    const description = createTextElement("dd", valueClassName, value);

    item.className = "detail-book__metadata-item";
    item.append(term, description);
    return item;
}

function createBookDetail(book) {
    const article = document.createElement("article");
    const title = createTextElement("h3", "detail-book__title", book.title || "タイトル未設定");
    const progressSection = document.createElement("section");
    const progressHeading = document.createElement("div");
    const progressLabel = createTextElement("span", "detail-book__progress-label", "進捗");
    const progressText = createTextElement(
        "span",
        "detail-book__progress-text",
        `${book.currentPage} / ${book.totalPages}`
    );
    const progressBar = document.createElement("span");
    const progressValue = document.createElement("span");
    const progressPercentage = calculateProgressPercentage(book.currentPage, book.totalPages);
    const main = document.createElement("div");
    const cover = document.createElement("figure");
    const coverImage = document.createElement("img");
    const metadata = document.createElement("dl");
    const footer = document.createElement("footer");
    const deleteButton = createTextElement("button", "detail-panel__delete", "削除");

    article.className = "detail-book";

    progressSection.className = "detail-book__progress";
    progressSection.setAttribute("aria-label", "読書の進捗");
    progressHeading.className = "detail-book__progress-heading";
    progressHeading.append(progressLabel, progressText);
    progressBar.className = "detail-book__progress-bar";
    progressBar.setAttribute("role", "progressbar");
    progressBar.setAttribute("aria-valuemin", "0");
    progressBar.setAttribute("aria-valuemax", "100");
    progressBar.setAttribute("aria-valuenow", String(Math.round(progressPercentage)));
    progressBar.setAttribute("aria-valuetext", `${book.currentPage} / ${book.totalPages} ページ`);
    progressValue.className = "detail-book__progress-value";
    progressValue.style.width = `${progressPercentage}%`;
    progressBar.appendChild(progressValue);
    progressSection.append(progressHeading, progressBar);

    main.className = "detail-book__main";
    cover.className = "detail-book__cover";
    coverImage.src = getCoverImagePath(book.coverImagePath);
    coverImage.alt = `${book.title || "本"}の表紙`;
    coverImage.addEventListener("error", () => {
        coverImage.src = DEFAULT_COVER_IMAGE_PATH;
    }, { once: true });
    cover.appendChild(coverImage);

    metadata.className = "detail-book__metadata";
    metadata.append(
        createMetadataItem("ジャンル", getEnumLabel(book.genre, GENRE_LABELS, GENRE_NAME_LABELS)),
        createMetadataItem(
            "興味レベル",
            getEnumLabel(book.interestLevel, INTEREST_LEVEL_LABELS, INTEREST_LEVEL_NAME_LABELS)
        ),
        createMetadataItem(
            "読了状態",
            book.isCompleted ? "読了済み" : "未読了",
            "detail-book__completion"
        ),
        createMetadataItem(
            "最後に読んだ日",
            formatLastReadAt(book.lastReadAt),
            "detail-book__last-read"
        )
    );
    main.append(cover, metadata);

    footer.className = "detail-book__footer";
    deleteButton.type = "button";
    deleteButton.disabled = true;
    deleteButton.title = "削除機能は現在準備中です";
    footer.appendChild(deleteButton);

    article.append(title, progressSection, main, footer);
    return article;
}

function createEnumSelect(id, name, numericLabels, nameLabels, currentValue) {
    const select = document.createElement("select");
    const selectedValue = getEnumNumericValue(currentValue, numericLabels, nameLabels);

    select.id = id;
    select.name = name;
    select.className = "detail-book__select";
    select.required = true;

    for (const [value, label] of Object.entries(numericLabels)) {
        const option = document.createElement("option");

        option.value = value;
        option.textContent = label;
        option.selected = Number(value) === selectedValue;
        select.appendChild(option);
    }

    return select;
}

function createMetadataControlItem(label, control) {
    const item = document.createElement("div");
    const term = document.createElement("dt");
    const fieldLabel = createTextElement("label", "", label);
    const description = document.createElement("dd");

    item.className = "detail-book__metadata-item detail-book__metadata-item--editable";
    fieldLabel.htmlFor = control.id;
    term.appendChild(fieldLabel);
    description.appendChild(control);
    item.append(term, description);
    return item;
}

function createBookEditForm(book) {
    const form = document.createElement("form");
    const titleField = document.createElement("div");
    const titleLabel = createTextElement("label", "detail-book__field-label", "タイトル");
    const titleInput = document.createElement("input");
    const progressSection = document.createElement("section");
    const progressHeading = document.createElement("div");
    const progressLabel = createTextElement("span", "detail-book__progress-label", "進捗");
    const progressInputs = document.createElement("div");
    const currentPageLabel = createTextElement("label", "visually-hidden", "現在ページ");
    const currentPageInput = document.createElement("input");
    const progressSeparator = createTextElement("span", "detail-book__progress-separator", "/");
    const totalPagesLabel = createTextElement("label", "visually-hidden", "総ページ数");
    const totalPagesInput = document.createElement("input");
    const progressBar = document.createElement("span");
    const progressValue = document.createElement("span");
    const main = document.createElement("div");
    const cover = document.createElement("figure");
    const coverImage = document.createElement("img");
    const metadata = document.createElement("dl");
    const genreSelect = createEnumSelect(
        "book-edit-genre",
        "genre",
        GENRE_LABELS,
        GENRE_NAME_LABELS,
        book.genre
    );
    const interestLevelSelect = createEnumSelect(
        "book-edit-interest-level",
        "interestLevel",
        INTEREST_LEVEL_LABELS,
        INTEREST_LEVEL_NAME_LABELS,
        book.interestLevel
    );
    const errorMessage = createTextElement("p", "detail-book__edit-error", "");
    const savingStatus = createTextElement("p", "detail-book__saving-status", "保存しています…");

    form.id = "book-edit-form";
    form.className = "detail-book detail-book--editing";
    form.addEventListener("submit", saveBookEdits);

    titleField.className = "detail-book__field detail-book__field--title";
    titleLabel.htmlFor = "book-edit-title";
    titleInput.id = "book-edit-title";
    titleInput.name = "title";
    titleInput.className = "detail-book__input detail-book__title-input";
    titleInput.type = "text";
    titleInput.value = book.title ?? "";
    titleInput.required = true;
    titleInput.maxLength = 100;
    titleField.append(titleLabel, titleInput);

    currentPageInput.id = "book-edit-current-page";
    currentPageInput.name = "currentPage";
    currentPageInput.className = "detail-book__input detail-book__page-input";
    currentPageInput.type = "number";
    currentPageInput.min = "0";
    currentPageInput.step = "1";
    currentPageInput.required = true;
    currentPageInput.value = String(book.currentPage);
    currentPageLabel.htmlFor = currentPageInput.id;

    totalPagesInput.id = "book-edit-total-pages";
    totalPagesInput.name = "totalPages";
    totalPagesInput.className = "detail-book__input detail-book__page-input";
    totalPagesInput.type = "number";
    totalPagesInput.min = "1";
    totalPagesInput.max = "10000";
    totalPagesInput.step = "1";
    totalPagesInput.required = true;
    totalPagesInput.value = String(book.totalPages);
    totalPagesLabel.htmlFor = totalPagesInput.id;

    progressInputs.className = "detail-book__progress-inputs";
    progressInputs.append(
        currentPageLabel,
        currentPageInput,
        progressSeparator,
        totalPagesLabel,
        totalPagesInput
    );
    progressHeading.className = "detail-book__progress-heading";
    progressHeading.append(progressLabel, progressInputs);

    progressBar.className = "detail-book__progress-bar";
    progressBar.setAttribute("role", "progressbar");
    progressBar.setAttribute("aria-valuemin", "0");
    progressBar.setAttribute("aria-valuemax", "100");
    progressValue.className = "detail-book__progress-value";
    progressBar.appendChild(progressValue);
    progressSection.className = "detail-book__progress";
    progressSection.setAttribute("aria-label", "読書の進捗");
    progressSection.append(progressHeading, progressBar);

    const updateProgressPreview = () => {
        const currentPage = currentPageInput.valueAsNumber;
        const totalPages = totalPagesInput.valueAsNumber;
        const hasValidTotalPages = Number.isFinite(totalPages) && totalPages >= 1;
        const progressPercentage = calculateProgressPercentage(currentPage, totalPages);

        if (hasValidTotalPages) {
            currentPageInput.max = String(totalPages);
        } else {
            currentPageInput.removeAttribute("max");
        }

        currentPageInput.setCustomValidity(
            Number.isFinite(currentPage) && hasValidTotalPages && currentPage > totalPages
                ? "現在ページ数は総ページ数以下で入力してください。"
                : ""
        );
        progressBar.setAttribute("aria-valuenow", String(Math.round(progressPercentage)));
        progressBar.setAttribute(
            "aria-valuetext",
            Number.isFinite(currentPage) && Number.isFinite(totalPages)
                ? `${currentPage} / ${totalPages} ページ`
                : "進捗を計算できません"
        );
        progressValue.style.width = `${progressPercentage}%`;
    };

    currentPageInput.addEventListener("input", updateProgressPreview);
    totalPagesInput.addEventListener("input", updateProgressPreview);
    updateProgressPreview();

    main.className = "detail-book__main";
    cover.className = "detail-book__cover";
    coverImage.src = getCoverImagePath(book.coverImagePath);
    coverImage.alt = `${book.title || "本"}の表紙`;
    coverImage.addEventListener("error", () => {
        coverImage.src = DEFAULT_COVER_IMAGE_PATH;
    }, { once: true });
    cover.appendChild(coverImage);

    metadata.className = "detail-book__metadata detail-book__metadata--editing";
    metadata.append(
        createMetadataControlItem("ジャンル", genreSelect),
        createMetadataControlItem("興味レベル", interestLevelSelect),
        createMetadataItem(
            "読了状態",
            book.isCompleted ? "読了済み" : "未読了",
            "detail-book__completion"
        ),
        createMetadataItem(
            "最後に読んだ日",
            formatLastReadAt(book.lastReadAt),
            "detail-book__last-read"
        )
    );
    main.append(cover, metadata);

    errorMessage.id = "book-edit-error";
    errorMessage.setAttribute("role", "alert");
    errorMessage.hidden = true;
    savingStatus.id = "book-saving-status";
    savingStatus.setAttribute("role", "status");
    savingStatus.hidden = true;

    form.append(titleField, progressSection, main, errorMessage, savingStatus);
    return form;
}

function openBookDetailPanel() {
    bookDetailPanel.hidden = false;
    workspace.classList.add("workspace--detail-open");
}

function setDetailActionsUnavailable() {
    bookDetailPanel.classList.remove("detail-panel--editing");
    bookDetailEditButton.textContent = "編集";
    bookDetailEditButton.classList.remove("detail-panel__edit--save");
    bookDetailEditButton.disabled = true;
    bookDetailCancelButton.hidden = true;
    bookDetailCancelButton.disabled = false;
    bookDetailCloseButton.disabled = false;
}

function setDetailActionsForView() {
    bookDetailPanel.classList.remove("detail-panel--editing");
    bookDetailEditButton.textContent = "編集";
    bookDetailEditButton.classList.remove("detail-panel__edit--save");
    bookDetailEditButton.disabled = currentBookDetail === null;
    bookDetailCancelButton.hidden = true;
    bookDetailCancelButton.disabled = false;
    bookDetailCloseButton.disabled = false;
}

function setDetailActionsForEdit() {
    bookDetailPanel.classList.add("detail-panel--editing");
    bookDetailEditButton.textContent = "保存";
    bookDetailEditButton.classList.add("detail-panel__edit--save");
    bookDetailEditButton.disabled = false;
    bookDetailCancelButton.hidden = false;
    bookDetailCancelButton.disabled = false;
    bookDetailCloseButton.disabled = false;
}

function clearEditingState() {
    editingBookId = null;
    editBookSnapshot = null;
    isSavingBook = false;
    bookDetailPanel.setAttribute("aria-busy", "false");
}

function showBookDetailMessage(message, type) {
    const messageElement = createTextElement(
        "p",
        `detail-panel__message detail-panel__message--${type}`,
        message
    );

    if (type === "error") {
        messageElement.setAttribute("role", "alert");
    } else {
        messageElement.setAttribute("role", "status");
    }

    bookDetailContent.replaceChildren(messageElement);
}

function renderBookDetail(book) {
    currentBookDetail = book;
    bookDetailContent.replaceChildren(createBookDetail(book));
    setDetailActionsForView();
}

function startBookEditing() {
    if (currentBookDetail === null || isSavingBook) {
        return;
    }

    editingBookId = String(currentBookDetail.id);
    editBookSnapshot = { ...currentBookDetail };
    bookDetailContent.replaceChildren(createBookEditForm(editBookSnapshot));
    setDetailActionsForEdit();
    document.getElementById("book-edit-title")?.focus();
}

function cancelBookEditing() {
    if (editingBookId === null || editBookSnapshot === null || isSavingBook) {
        return;
    }

    const bookBeforeEditing = editBookSnapshot;

    clearEditingState();
    renderBookDetail(bookBeforeEditing);
    bookDetailEditButton.focus();
}

function hasUnsavedBookEdits() {
    const form = document.getElementById("book-edit-form");

    if (editingBookId === null || editBookSnapshot === null || form === null) {
        return false;
    }

    const genre = getEnumNumericValue(
        editBookSnapshot.genre,
        GENRE_LABELS,
        GENRE_NAME_LABELS
    );
    const interestLevel = getEnumNumericValue(
        editBookSnapshot.interestLevel,
        INTEREST_LEVEL_LABELS,
        INTEREST_LEVEL_NAME_LABELS
    );

    return form.elements.title.value !== String(editBookSnapshot.title ?? "")
        || form.elements.currentPage.value !== String(editBookSnapshot.currentPage)
        || form.elements.totalPages.value !== String(editBookSnapshot.totalPages)
        || form.elements.genre.value !== String(genre)
        || form.elements.interestLevel.value !== String(interestLevel);
}

function setSelectedBook(bookId) {
    selectedBookId = bookId === null ? null : String(bookId);

    for (const card of bookList.querySelectorAll(".book-card")) {
        const isSelected = selectedBookId !== null && card.dataset.bookId === selectedBookId;

        card.classList.toggle("is-selected", isSelected);
        card.setAttribute("aria-pressed", String(isSelected));
    }
}

function getSelectedBookCard() {
    return Array.from(bookList.querySelectorAll(".book-card"))
        .find((card) => card.dataset.bookId === selectedBookId) || null;
}

function closeBookDetailPanel(restoreCardFocus = false) {
    const selectedCard = getSelectedBookCard();

    if (bookDetailAbortController !== null) {
        bookDetailAbortController.abort();
        bookDetailAbortController = null;
    }

    bookDetailPanel.hidden = true;
    bookDetailPanel.setAttribute("aria-busy", "false");
    bookDetailContent.replaceChildren();
    workspace.classList.remove("workspace--detail-open");
    currentBookDetail = null;
    clearEditingState();
    setDetailActionsUnavailable();
    setSelectedBook(null);

    if (restoreCardFocus && selectedCard !== null) {
        selectedCard.focus();
    }
}

function requestCloseBookDetailPanel(restoreCardFocus = false) {
    if (isSavingBook) {
        return;
    }

    if (hasUnsavedBookEdits()
        && !window.confirm("編集中の変更内容は保存されません。詳細パネルを閉じますか？")) {
        return;
    }

    closeBookDetailPanel(restoreCardFocus);
}

function requestBookSelection(bookId) {
    const normalizedBookId = String(bookId);

    if (isSavingBook || (editingBookId !== null && normalizedBookId === editingBookId)) {
        return;
    }

    if (hasUnsavedBookEdits()
        && !window.confirm("編集中の変更内容は保存されません。別の本を表示しますか？")) {
        return;
    }

    clearEditingState();
    showBookDetail(normalizedBookId);
}

async function fetchBookDetail(bookId, signal) {
    const bookApiUrl = getBookApiUrl(bookId);
    const response = await fetch(bookApiUrl, { signal });

    if (!response.ok) {
        const error = new Error(`GET ${bookApiUrl} failed: ${response.status}`);
        error.status = response.status;
        throw error;
    }

    const book = await response.json();

    if (book === null || typeof book !== "object" || Array.isArray(book)) {
        throw new Error(`GET ${bookApiUrl} returned an invalid response.`);
    }

    return book;
}

async function showBookDetail(bookId) {
    const normalizedBookId = String(bookId);

    if (bookDetailAbortController !== null) {
        bookDetailAbortController.abort();
    }

    const requestController = new AbortController();

    bookDetailAbortController = requestController;
    currentBookDetail = null;
    setDetailActionsUnavailable();
    setSelectedBook(normalizedBookId);
    openBookDetailPanel();
    bookDetailPanel.setAttribute("aria-busy", "true");
    showBookDetailMessage("本の詳細を読み込んでいます…", "loading");

    try {
        const book = await fetchBookDetail(normalizedBookId, requestController.signal);

        if (selectedBookId !== normalizedBookId) {
            return;
        }

        renderBookDetail(book);
    } catch (error) {
        if (error.name === "AbortError" || selectedBookId !== normalizedBookId) {
            return;
        }

        console.error("本の詳細を取得できませんでした。", error);
        currentBookDetail = null;
        setDetailActionsUnavailable();
        showBookDetailMessage(
            error.status === 404
                ? "選択した本が見つかりませんでした。一覧を更新して再度お試しください。"
                : "本の詳細を取得できませんでした。時間をおいて再度お試しください。",
            "error"
        );
    } finally {
        if (bookDetailAbortController === requestController) {
            bookDetailAbortController = null;
            bookDetailPanel.setAttribute("aria-busy", "false");
        }
    }
}

async function readApiErrorMessage(response) {
    const responseText = (await response.text()).trim();

    if (responseText === "") {
        return "";
    }

    try {
        const responseBody = JSON.parse(responseText);

        if (typeof responseBody === "string") {
            return responseBody;
        }

        if (typeof responseBody?.detail === "string") {
            return responseBody.detail;
        }

        if (typeof responseBody?.title === "string") {
            return responseBody.title;
        }

        if (responseBody?.errors && typeof responseBody.errors === "object") {
            const firstValidationMessage = Object.values(responseBody.errors)
                .flat()
                .find((message) => typeof message === "string");

            return firstValidationMessage || "";
        }
    } catch {
        return responseText;
    }

    return responseText;
}

function setBookEditError(message) {
    const errorMessage = document.getElementById("book-edit-error");

    if (errorMessage === null) {
        return;
    }

    errorMessage.textContent = message;
    errorMessage.hidden = message === "";
}

function setBookSavingState(isSaving) {
    const savingStatus = document.getElementById("book-saving-status");

    isSavingBook = isSaving;
    bookDetailPanel.setAttribute("aria-busy", String(isSaving));
    bookDetailEditButton.textContent = isSaving ? "保存中…" : "保存";
    bookDetailEditButton.disabled = isSaving;
    bookDetailCancelButton.disabled = isSaving;
    bookDetailCloseButton.disabled = isSaving;

    if (savingStatus !== null) {
        savingStatus.hidden = !isSaving;
    }
}

function createUpdateBookPayload(form) {
    return {
        title: form.elements.title.value,
        genre: Number(form.elements.genre.value),
        totalPages: form.elements.totalPages.valueAsNumber,
        currentPage: form.elements.currentPage.valueAsNumber,
        interestLevel: Number(form.elements.interestLevel.value),
        coverImagePath: editBookSnapshot?.coverImagePath ?? null
    };
}

function getSaveFailureMessage(error) {
    if (error.status === 400) {
        return error.apiMessage
            ? `入力内容を保存できませんでした。${error.apiMessage}`
            : "入力内容を保存できませんでした。入力値を確認してください。";
    }

    if (error.status === 404) {
        return "この本は見つかりませんでした。すでに削除された可能性があります。";
    }

    return "本を保存できませんでした。入力内容は残っています。時間をおいて再度お試しください。";
}

async function saveBookEdits(event) {
    event.preventDefault();

    const form = event.currentTarget;

    if (isSavingBook || editingBookId === null || editBookSnapshot === null) {
        return;
    }

    if (!form.reportValidity()) {
        return;
    }

    const savedBookId = editingBookId;
    const bookApiUrl = getBookApiUrl(savedBookId);
    const updatePayload = createUpdateBookPayload(form);
    let updateCompleted = false;

    setBookEditError("");
    setBookSavingState(true);

    try {
        const response = await fetch(bookApiUrl, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(updatePayload)
        });

        if (!response.ok) {
            const error = new Error(`PUT ${bookApiUrl} failed: ${response.status}`);

            error.status = response.status;
            error.apiMessage = await readApiErrorMessage(response);
            throw error;
        }

        updateCompleted = true;

        const [latestBook, books] = await Promise.all([
            fetchBookDetail(savedBookId),
            fetchBooks()
        ]);

        clearEditingState();
        renderBooks(books);
        updateResultCount(books.length);
        setSelectedBook(savedBookId);
        renderBookDetail(latestBook);
        bookDetailEditButton.focus();
    } catch (error) {
        console.error("本を保存できませんでした。", error);

        if (updateCompleted) {
            clearEditingState();
            currentBookDetail = null;
            setDetailActionsUnavailable();
            showBookDetailMessage(
                "保存は完了しましたが、最新情報を再取得できませんでした。一覧から本を選び直してください。",
                "error"
            );
            return;
        }

        setBookSavingState(false);
        setBookEditError(getSaveFailureMessage(error));
    }
}

function createBookCard(book) {
    const bookItem = bookCardTemplate.content.firstElementChild.cloneNode(true);
    const card = bookItem.querySelector(".book-card");
    const coverImage = bookItem.querySelector(".book-card__cover-image");
    const title = bookItem.querySelector(".book-card__title");
    const currentPage = bookItem.querySelector(".book-card__current-page");
    const totalPages = bookItem.querySelector(".book-card__total-pages");
    const progress = bookItem.querySelector(".book-card__progress");
    const progressValue = bookItem.querySelector(".book-card__progress-value");
    const progressPercentage = calculateProgressPercentage(book.currentPage, book.totalPages);

    card.dataset.bookId = String(book.id);
    card.setAttribute("aria-pressed", "false");
    card.addEventListener("click", () => {
        requestBookSelection(book.id);
    });
    coverImage.src = getCoverImagePath(book.coverImagePath);
    coverImage.alt = `${book.title}の表紙`;
    coverImage.addEventListener("error", () => {
        coverImage.src = DEFAULT_COVER_IMAGE_PATH;
    }, { once: true });

    title.textContent = book.title;
    currentPage.textContent = book.currentPage;
    totalPages.textContent = book.totalPages;
    progress.setAttribute("aria-valuenow", String(Math.round(progressPercentage)));
    progress.setAttribute("aria-valuetext", `${book.currentPage} / ${book.totalPages} ページ`);
    progressValue.style.width = `${progressPercentage}%`;

    return bookItem;
}

function showListMessage(message, type) {
    const messageItem = document.createElement("li");

    messageItem.className = `book-grid__message book-grid__message--${type}`;
    messageItem.textContent = message;

    if (type === "error") {
        messageItem.setAttribute("role", "alert");
    }

    bookList.replaceChildren(messageItem);
}

function renderBooks(books) {
    const selectedBookIdBeforeRender = selectedBookId;

    if (books.length === 0) {
        showListMessage("本がまだ登録されていません。", "empty");
        return;
    }

    const cards = document.createDocumentFragment();

    for (const book of books) {
        cards.appendChild(createBookCard(book));
    }

    bookList.replaceChildren(cards);

    if (selectedBookIdBeforeRender !== null) {
        setSelectedBook(selectedBookIdBeforeRender);
    }
}

function updateResultCount(count) {
    bookResultCount.textContent = count === null
        ? "表示件数: 取得失敗"
        : `表示件数: ${count}冊`;
}

bookDetailCloseButton.addEventListener("click", () => {
    requestCloseBookDetailPanel(true);
});

bookDetailEditButton.addEventListener("click", () => {
    if (editingBookId === null) {
        startBookEditing();
        return;
    }

    document.getElementById("book-edit-form")?.requestSubmit();
});

bookDetailCancelButton.addEventListener("click", () => {
    cancelBookEditing();
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !bookDetailPanel.hidden) {
        requestCloseBookDetailPanel(true);
    }
});

loadBooks();
