async function loadBooks() {
    try {
        const response = await fetch("/api/books");

        if (!response.ok) {
            throw new Error(`GET /api/books failed: ${response.status}`);
        }

        const books = await response.json();

        if (!Array.isArray(books)) {
            throw new Error("GET /api/books returned an invalid response.");
        }

        renderBooks(books);
        updateResultCount(books.length);
    } catch (error) {
        console.error("本の一覧を取得できませんでした。", error);
        showListMessage("本の一覧を取得できませんでした。時間をおいて再度お試しください。", "error");
        updateResultCount(null);
    }
}

const DEFAULT_COVER_IMAGE_PATH = "/images/default-book-cover.png";

const bookList = document.getElementById("book-list");
const bookCardTemplate = document.getElementById("book-card-template");
const bookResultCount = document.getElementById("book-result-count");
const workspace = document.querySelector(".workspace");
const bookDetailPanel = document.getElementById("book-detail-panel");
const bookDetailContent = document.getElementById("book-detail-content");
const bookDetailCloseButton = document.getElementById("book-detail-close");

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

function openBookDetailPanel() {
    bookDetailPanel.hidden = false;
    workspace.classList.add("workspace--detail-open");
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
    bookDetailContent.replaceChildren(createBookDetail(book));
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
    setSelectedBook(null);

    if (restoreCardFocus && selectedCard !== null) {
        selectedCard.focus();
    }
}

async function fetchBookDetail(bookId, signal) {
    const response = await fetch(`/api/books/${encodeURIComponent(bookId)}`, { signal });

    if (!response.ok) {
        const error = new Error(`GET /api/books/${bookId} failed: ${response.status}`);
        error.status = response.status;
        throw error;
    }

    const book = await response.json();

    if (book === null || typeof book !== "object" || Array.isArray(book)) {
        throw new Error(`GET /api/books/${bookId} returned an invalid response.`);
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
        showBookDetail(book.id);
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
    if (books.length === 0) {
        showListMessage("本がまだ登録されていません。", "empty");
        return;
    }

    const cards = document.createDocumentFragment();

    for (const book of books) {
        cards.appendChild(createBookCard(book));
    }

    bookList.replaceChildren(cards);
}

function updateResultCount(count) {
    bookResultCount.textContent = count === null
        ? "表示件数: 取得失敗"
        : `表示件数: ${count}冊`;
}

bookDetailCloseButton.addEventListener("click", () => {
    closeBookDetailPanel(true);
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !bookDetailPanel.hidden) {
        closeBookDetailPanel(true);
    }
});

loadBooks();
