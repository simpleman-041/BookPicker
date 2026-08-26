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

loadBooks();
