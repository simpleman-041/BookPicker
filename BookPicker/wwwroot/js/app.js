async function loadBooks() {
    try {
        const books = await fetchBooks();

        updateBookList(books);
    } catch (error) {
        console.error("本の一覧を取得できませんでした。", error);
        showListMessage("本の一覧を取得できませんでした。時間をおいて再度お試しください。", "error");
        updateResultCount(null);
    }
}

const BOOKS_API_URL = "/api/books";
const DEFAULT_COVER_IMAGE_PATH = "/images/default-book-cover.png";
const TITLE_MATCH_MODE_QUERY_VALUES = {
    partial: "Partial",
    exact: "Exact"
};
const READING_STATUS_QUERY_VALUES = {
    lateStage: "3"
};
const SORT_QUERY_VALUES = {
    interestLevel: "InterestLevel",
    totalPages: "TotalPages",
    lastReadAt: "LastReadAt",
    ascending: "Ascending",
    descending: "Descending"
};
const QUICK_FILTERS = {
    all: {
        sortField: "",
        sortOrder: ""
    },
    interest: {
        sortField: SORT_QUERY_VALUES.interestLevel,
        sortOrder: SORT_QUERY_VALUES.descending
    },
    "nearly-finished": {
        readingStatus: READING_STATUS_QUERY_VALUES.lateStage,
        sortField: "",
        sortOrder: ""
    },
    long: {
        sortField: SORT_QUERY_VALUES.totalPages,
        sortOrder: SORT_QUERY_VALUES.descending
    },
    short: {
        sortField: SORT_QUERY_VALUES.totalPages,
        sortOrder: SORT_QUERY_VALUES.ascending
    },
    "recently-read": {
        sortField: SORT_QUERY_VALUES.lastReadAt,
        sortOrder: SORT_QUERY_VALUES.descending
    }
};

const bookList = document.getElementById("book-list");
const bookCardTemplate = document.getElementById("book-card-template");
const bookResultCount = document.getElementById("book-result-count");
const titleSearchForm = document.getElementById("title-search-form");
const titleSearchInput = document.getElementById("title-search");
const titleSearchButton = document.getElementById("title-search-button");
const titleMatchModeInputs = document.querySelectorAll('input[name="titleMatchMode"]');
const interestLevelFilter = document.getElementById("interest-level");
const genreFilter = document.getElementById("genre");
const readingStatusFilter = document.getElementById("reading-status");
const detailedFilterResetButton = document.getElementById("detailed-filter-reset");
const quickFilterButtons = document.querySelectorAll("[data-quick-filter]");
const favoriteFilterButton = document.getElementById("favorite-filter");
const bookListActionError = document.getElementById("book-list-action-error");
const workspace = document.querySelector(".workspace");
const helpButton = document.getElementById("help-button");
const helpPanel = document.getElementById("help-panel");
const helpPanelCloseButton = document.getElementById("help-panel-close");
const addBookButton = document.getElementById("add-book-button");
const bookDetailPanel = document.getElementById("book-detail-panel");
const bookDetailHeading = document.getElementById("detail-panel-heading");
const bookDetailContent = document.getElementById("book-detail-content");
const bookDetailCloseButton = document.getElementById("book-detail-close");
const bookDetailEditButton = document.getElementById("book-detail-edit");
const bookDetailCancelButton = document.getElementById("book-detail-cancel");
const bookDeleteDialog = document.getElementById("book-delete-dialog");
const bookDeleteHeading = document.getElementById("book-delete-heading");
const bookDeleteError = document.getElementById("book-delete-error");
const bookDeleteStatus = document.getElementById("book-delete-status");
const bookDeleteCancelButton = document.getElementById("book-delete-cancel");
const bookDeleteConfirmButton = document.getElementById("book-delete-confirm");

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

const READING_STATUS_LABELS = {
    0: "未着手",
    1: "序盤",
    2: "中盤",
    3: "終盤",
    4: "読了"
};

let selectedBookId = null;
let bookDetailAbortController = null;
let currentBookDetail = null;
let editingBookId = null;
let editBookSnapshot = null;
let pendingEditCoverFile = null;
let pendingEditCoverPreviewUrl = null;
let pendingCreateCoverFile = null;
let pendingCreateCoverPreviewUrl = null;
let isSavingBook = false;
let isCreatingBook = false;
let isRegisteringBook = false;
let createBookReturnState = null;
let isUpdatingCompletion = false;
let completionUpdateTarget = null;
let isUpdatingProgress = false;
let isUploadingCover = false;
let isDeletingBook = false;
let favoriteUpdateBookId = null;
let deleteDialogReturnFocus = null;
let isSearchingBooks = false;
let bookListQueryRequestId = 0;
let detailPanelCloseCleanup = null;
let helpPanelCloseCleanup = null;
let helpPanelAnimationFrame = null;
let bookListLayoutAnimationFrame = null;
const bookListLayoutAnimationCleanups = new Set();
let bookListQueryState = {
    searchTitle: "",
    titleMatchMode: TITLE_MATCH_MODE_QUERY_VALUES.partial,
    interestLevel: "",
    genre: "",
    readingStatus: "",
    detailReadingStatus: "",
    quickFilter: "all",
    isFavorite: false,
    sortField: "",
    sortOrder: ""
};

function getBookApiUrl(bookId) {
    return `${BOOKS_API_URL}/${encodeURIComponent(bookId)}`;
}

function getBookCompletionApiUrl(bookId) {
    return `${getBookApiUrl(bookId)}/completion`;
}

function getBookProgressApiUrl(bookId) {
    return `${getBookApiUrl(bookId)}/progress`;
}

function getBookCoverApiUrl(bookId) {
    return `${getBookApiUrl(bookId)}/cover`;
}

function getBookFavoriteApiUrl(bookId) {
    return `${getBookApiUrl(bookId)}/favorite`;
}

function buildBooksApiUrl(queryState = bookListQueryState) {
    const queryParameters = new URLSearchParams();

    if (queryState.searchTitle !== "") {
        queryParameters.set("SearchTitle", queryState.searchTitle);
        queryParameters.set("TitleMatchMode", queryState.titleMatchMode);
    }

    if (queryState.interestLevel !== "") {
        queryParameters.set("InterestLevel", queryState.interestLevel);
    }

    if (queryState.genre !== "") {
        queryParameters.set("Genre", queryState.genre);
    }

    if (queryState.readingStatus !== "") {
        queryParameters.set("ReadingStatus", queryState.readingStatus);
    }

    if (queryState.isFavorite === true) {
        queryParameters.set("IsFavorite", "true");
    }

    if (queryState.sortField !== "" && queryState.sortOrder !== "") {
        queryParameters.set("Field", queryState.sortField);
        queryParameters.set("Order", queryState.sortOrder);
    }

    const queryString = queryParameters.toString();

    return queryString === "" ? BOOKS_API_URL : `${BOOKS_API_URL}?${queryString}`;
}

async function fetchBooks(queryState = bookListQueryState) {
    const booksApiUrl = buildBooksApiUrl(queryState);
    const response = await fetch(booksApiUrl);

    if (!response.ok) {
        const error = new Error(`GET ${booksApiUrl} failed: ${response.status}`);
        error.status = response.status;
        throw error;
    }

    const books = await response.json();

    if (!Array.isArray(books)) {
        throw new Error(`GET ${booksApiUrl} returned an invalid response.`);
    }

    return books;
}

function getSelectedTitleMatchMode() {
    const selectedInput = Array.from(titleMatchModeInputs)
        .find((input) => input.checked);

    return TITLE_MATCH_MODE_QUERY_VALUES[selectedInput?.value]
        ?? TITLE_MATCH_MODE_QUERY_VALUES.partial;
}

function syncTitleSearchQueryState(queryState) {
    return {
        ...queryState,
        searchTitle: titleSearchInput.value.trim(),
        titleMatchMode: getSelectedTitleMatchMode()
    };
}

function createTitleSearchQueryState() {
    return syncTitleSearchQueryState(bookListQueryState);
}

function createDetailedFilterQueryState(changedFilter) {
    const readingStatusWasChanged = changedFilter === readingStatusFilter;
    const nearlyFinishedWasSelected = bookListQueryState.quickFilter === "nearly-finished";
    const nextReadingStatus = readingStatusWasChanged
        ? readingStatusFilter.value
        : bookListQueryState.readingStatus;

    return syncTitleSearchQueryState({
        ...bookListQueryState,
        interestLevel: interestLevelFilter.value,
        genre: genreFilter.value,
        readingStatus: nextReadingStatus,
        detailReadingStatus: readingStatusWasChanged
            ? readingStatusFilter.value
            : bookListQueryState.detailReadingStatus,
        quickFilter: readingStatusWasChanged && nearlyFinishedWasSelected
            ? "all"
            : bookListQueryState.quickFilter,
        sortField: readingStatusWasChanged && nearlyFinishedWasSelected
            ? ""
            : bookListQueryState.sortField,
        sortOrder: readingStatusWasChanged && nearlyFinishedWasSelected
            ? ""
            : bookListQueryState.sortOrder
    });
}

function createDetailedFilterResetQueryState() {
    const nearlyFinishedIsSelected = bookListQueryState.quickFilter === "nearly-finished";

    return syncTitleSearchQueryState({
        ...bookListQueryState,
        interestLevel: "",
        genre: "",
        detailReadingStatus: "",
        readingStatus: nearlyFinishedIsSelected
            ? READING_STATUS_QUERY_VALUES.lateStage
            : ""
    });
}

function createQuickFilterQueryState(quickFilter) {
    const quickFilterDefinition = QUICK_FILTERS[quickFilter] ?? QUICK_FILTERS.all;
    const nearlyFinishedWasSelected = bookListQueryState.quickFilter === "nearly-finished";

    return syncTitleSearchQueryState({
        ...bookListQueryState,
        quickFilter: QUICK_FILTERS[quickFilter] === undefined ? "all" : quickFilter,
        readingStatus: quickFilterDefinition.readingStatus
            ?? (nearlyFinishedWasSelected
                ? bookListQueryState.detailReadingStatus
                : bookListQueryState.readingStatus),
        sortField: quickFilterDefinition.sortField,
        sortOrder: quickFilterDefinition.sortOrder
    });
}

function createFavoriteFilterQueryState() {
    return syncTitleSearchQueryState({
        ...bookListQueryState,
        isFavorite: !bookListQueryState.isFavorite
    });
}

function syncTitleSearchControls(queryState) {
    titleSearchInput.value = queryState.searchTitle;

    const inputValue = queryState.titleMatchMode === TITLE_MATCH_MODE_QUERY_VALUES.exact
        ? "exact"
        : "partial";

    for (const input of titleMatchModeInputs) {
        input.checked = input.value === inputValue;
    }
}

function syncDetailedFilterControls(queryState) {
    interestLevelFilter.value = queryState.interestLevel;
    genreFilter.value = queryState.genre;
    readingStatusFilter.value = queryState.quickFilter === "nearly-finished"
        ? queryState.detailReadingStatus
        : queryState.readingStatus;
    updateDetailedFilterResetButtonState();
}

function updateDetailedFilterResetButtonState() {
    detailedFilterResetButton.disabled = interestLevelFilter.value === ""
        && genreFilter.value === ""
        && readingStatusFilter.value === "";
}

function syncQuickFilterControls(queryState) {
    for (const button of quickFilterButtons) {
        const isActive = button.dataset.quickFilter === queryState.quickFilter;

        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
    }
}

function syncFavoriteFilterControl(queryState) {
    const isActive = queryState.isFavorite === true;
    const star = favoriteFilterButton.querySelector(".favorite-filter__star");

    favoriteFilterButton.classList.toggle("is-active", isActive);
    favoriteFilterButton.setAttribute("aria-pressed", String(isActive));

    if (star !== null) {
        star.textContent = isActive ? "★" : "☆";
    }
}

function syncBookListQueryControls(queryState) {
    syncTitleSearchControls(queryState);
    syncDetailedFilterControls(queryState);
    syncQuickFilterControls(queryState);
    syncFavoriteFilterControl(queryState);
}

function populateDetailedFilterOptions(select, labels) {
    const options = document.createDocumentFragment();

    for (const [value, label] of Object.entries(labels)) {
        const option = document.createElement("option");

        option.value = value;
        option.textContent = label;
        options.appendChild(option);
    }

    select.appendChild(options);
}

function setTitleSearchingState(isSearching) {
    isSearchingBooks = isSearching;
    titleSearchForm.setAttribute("aria-busy", String(isSearching));
    titleSearchButton.disabled = isSearching;
    titleSearchButton.setAttribute(
        "aria-label",
        isSearching ? "タイトルを検索中" : "タイトルを検索"
    );
}

function containsBookId(books, bookId) {
    const normalizedBookId = String(bookId);

    return books.some((book) => String(book.id) === normalizedBookId);
}

async function searchBooksByTitle() {
    await applyBookListQueryState(
        createTitleSearchQueryState(),
        "タイトル検索に失敗しました。時間をおいて再度お試しください。",
        "検索結果から編集中の本が外れます。未保存の変更を破棄して検索しますか？"
    );
}

async function searchBooksByDetailedFilters(changedFilter) {
    const nextQueryState = createDetailedFilterQueryState(changedFilter);

    syncBookListQueryControls(nextQueryState);
    await applyBookListQueryState(
        nextQueryState,
        "本の一覧を取得できませんでした。時間をおいて再度お試しください。",
        "絞り込み結果から編集中の本が外れます。未保存の変更を破棄して絞り込みますか？"
    );
}

async function resetDetailedFilters() {
    const nextQueryState = createDetailedFilterResetQueryState();

    syncDetailedFilterControls(nextQueryState);
    await applyBookListQueryState(
        nextQueryState,
        "本の一覧を取得できませんでした。時間をおいて再度お試しください。",
        "絞り込み結果から編集中の本が外れます。未保存の変更を破棄して絞り込みますか？"
    );
}

async function searchBooksByQuickFilter(quickFilter) {
    const nextQueryState = createQuickFilterQueryState(quickFilter);

    syncBookListQueryControls(nextQueryState);
    await applyBookListQueryState(
        nextQueryState,
        "本の一覧を取得できませんでした。時間をおいて再度お試しください。",
        "クイック条件の結果から編集中の本が外れます。未保存の変更を破棄して絞り込みますか？"
    );
}

async function searchBooksByFavoriteFilter() {
    const nextQueryState = createFavoriteFilterQueryState();

    syncFavoriteFilterControl(nextQueryState);
    await applyBookListQueryState(
        nextQueryState,
        "お気に入りの絞り込みに失敗しました。時間をおいて再度お試しください。",
        "絞り込み結果から編集中の本が外れます。未保存の変更を破棄して絞り込みますか？"
    );
}

async function applyBookListQueryState(nextQueryState, failureMessage, discardMessage) {
    const previousQueryState = { ...bookListQueryState };
    nextQueryState = syncTitleSearchQueryState(nextQueryState);
    const requestId = ++bookListQueryRequestId;

    bookListQueryState = nextQueryState;
    setTitleSearchingState(true);

    try {
        const books = await fetchBooks(nextQueryState);

        if (requestId !== bookListQueryRequestId) {
            return;
        }

        const selectedBookIsExcluded = selectedBookId !== null
            && !containsBookId(books, selectedBookId);

        if (selectedBookIsExcluded
            && !isCreatingBook
            && !confirmDiscardUnsavedPanelChanges(discardMessage)) {
            if (requestId !== bookListQueryRequestId) {
                return;
            }

            bookListQueryState = previousQueryState;
            syncBookListQueryControls(previousQueryState);
            syncTitleSearchControls(syncTitleSearchQueryState(previousQueryState));
            return;
        }

        if (requestId !== bookListQueryRequestId) {
            return;
        }

        updateBookList(books);

        if (selectedBookIsExcluded && isCreatingBook) {
            createBookReturnState = null;
            setSelectedBook(null);
        } else if (selectedBookIsExcluded) {
            closeBookDetailPanel();
        }
    } catch (error) {
        if (requestId !== bookListQueryRequestId) {
            return;
        }

        console.error("本の一覧の再取得に失敗しました。", error);
        showListMessage(failureMessage, "error");
        updateResultCount(null);
    } finally {
        if (requestId === bookListQueryRequestId) {
            setTitleSearchingState(false);
        }
    }
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

function createFavoriteButton(book, source) {
    const button = document.createElement("button");
    const star = createTextElement(
        "span",
        source === "detail"
            ? "detail-book__favorite-star"
            : "book-card__favorite-star",
        book.isFavorite ? "★" : "☆"
    );
    const bookId = String(book.id);
    const isFavorite = Boolean(book.isFavorite);
    const isUpdating = favoriteUpdateBookId === bookId;
    const actionLabel = isFavorite ? "お気に入りから外す" : "お気に入りに追加";

    button.type = "button";
    button.className = source === "detail"
        ? "detail-book__favorite-button"
        : "book-card__favorite";
    if (source === "detail") {
        button.id = "book-detail-favorite";
    }
    button.classList.toggle("is-favorite", isFavorite);
    button.dataset.favoriteBookId = bookId;
    button.dataset.favoriteSource = source;
    button.dataset.favoriteTitle = book.title || "この本";
    button.setAttribute("aria-pressed", String(isFavorite));
    button.setAttribute(
        "aria-label",
        isUpdating ? `${book.title}のお気に入り状態を更新中` : `${book.title}を${actionLabel}`
    );
    button.title = actionLabel;
    button.disabled = isUpdating || (source === "detail" && isDetailUpdateInProgress());
    button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        requestBookFavoriteChange(book, source);
    });
    button.appendChild(star);

    return button;
}

function createDetailFavoriteControl(book) {
    const control = document.createElement("div");
    const errorMessage = createTextElement("p", "detail-book__favorite-error", "");
    const updatingStatus = createTextElement(
        "p",
        "detail-book__favorite-status",
        "お気に入り状態を更新しています…"
    );

    control.className = "detail-book__favorite-control";
    errorMessage.id = "book-favorite-error";
    errorMessage.setAttribute("role", "alert");
    errorMessage.hidden = true;
    updatingStatus.id = "book-favorite-status";
    updatingStatus.setAttribute("role", "status");
    updatingStatus.hidden = favoriteUpdateBookId !== String(book.id);
    control.append(createFavoriteButton(book, "detail"), errorMessage, updatingStatus);

    return control;
}

function isDetailUpdateInProgress() {
    return isSavingBook
        || isRegisteringBook
        || isUpdatingCompletion
        || isUpdatingProgress
        || isUploadingCover
        || isDeletingBook
        || favoriteUpdateBookId !== null;
}

function createCoverUploadControl(book, options = {}) {
    const imageSource = options.imageSource ?? getCoverImagePath(book.coverImagePath);
    const isChangePending = options.isChangePending === true;
    const pendingLabelText = options.pendingLabelText ?? "変更予定";
    const showUploadFeedback = options.showUploadFeedback !== false;
    const onFileSelected = options.onFileSelected
        ?? ((selectedFile) => requestBookCoverUpload(book, selectedFile));
    const container = document.createElement("div");
    const cover = document.createElement("figure");
    const selectButton = document.createElement("button");
    const coverImage = document.createElement("img");
    const hoverLabel = createTextElement("span", "detail-book__cover-label", "表紙を変更");
    const pendingLabel = createTextElement("span", "detail-book__cover-pending", pendingLabelText);
    const fileInput = document.createElement("input");
    const errorMessage = showUploadFeedback
        ? createTextElement("p", "detail-book__cover-error", "")
        : null;
    const uploadingStatus = showUploadFeedback
        ? createTextElement("p", "detail-book__cover-status", "表紙をアップロードしています…")
        : null;

    container.className = "detail-book__cover-upload";
    cover.className = "detail-book__cover";

    selectButton.id = "book-cover-select";
    selectButton.className = "detail-book__cover-button";
    selectButton.type = "button";
    selectButton.title = "クリックして表紙画像を変更";
    selectButton.setAttribute("aria-label", `${book.title || "本"}の表紙画像を変更`);
    selectButton.classList.toggle("detail-book__cover-button--pending", isChangePending);
    selectButton.disabled = isDetailUpdateInProgress();
    selectButton.addEventListener("click", () => {
        if (!isDetailUpdateInProgress()) {
            fileInput.click();
        }
    });

    coverImage.id = "book-cover-preview";
    coverImage.src = imageSource;
    coverImage.alt = `${book.title || "本"}の表紙`;
    coverImage.addEventListener("error", () => {
        coverImage.src = DEFAULT_COVER_IMAGE_PATH;
    }, { once: true });

    fileInput.id = "book-cover-file";
    fileInput.className = "visually-hidden";
    fileInput.type = "file";
    fileInput.name = "file";
    fileInput.accept = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";
    fileInput.disabled = isDetailUpdateInProgress();
    fileInput.addEventListener("change", () => {
        const selectedFile = fileInput.files?.[0];

        fileInput.value = "";
        if (selectedFile !== undefined) {
            onFileSelected(selectedFile);
        }
    });

    pendingLabel.hidden = !isChangePending;

    if (errorMessage !== null && uploadingStatus !== null) {
        errorMessage.id = "book-cover-error";
        errorMessage.setAttribute("role", "alert");
        errorMessage.hidden = true;

        uploadingStatus.id = "book-cover-status";
        uploadingStatus.setAttribute("role", "status");
        uploadingStatus.hidden = !isUploadingCover;
    }

    selectButton.append(coverImage, hoverLabel, pendingLabel);
    cover.appendChild(selectButton);
    container.append(cover, fileInput);

    if (errorMessage !== null && uploadingStatus !== null) {
        container.append(errorMessage, uploadingStatus);
    }

    return container;
}

function releaseCoverPreviewUrl(previewUrl) {
    if (previewUrl !== null) {
        URL.revokeObjectURL(previewUrl);
    }

    return null;
}

function showPendingCoverPreview(previewUrl, pendingLabelText) {
    const previewImage = document.getElementById("book-cover-preview");
    const selectButton = document.getElementById("book-cover-select");
    const pendingLabel = document.querySelector(".detail-book__cover-pending");

    if (previewImage !== null) {
        previewImage.src = previewUrl;
    }

    if (selectButton !== null) {
        selectButton.classList.add("detail-book__cover-button--pending");
    }

    if (pendingLabel !== null) {
        pendingLabel.textContent = pendingLabelText;
        pendingLabel.hidden = false;
    }
}

function clearPendingEditCover() {
    pendingEditCoverPreviewUrl = releaseCoverPreviewUrl(pendingEditCoverPreviewUrl);

    pendingEditCoverFile = null;
}

function setPendingEditCover(file) {
    clearPendingEditCover();

    pendingEditCoverFile = file;
    pendingEditCoverPreviewUrl = URL.createObjectURL(file);

    showPendingCoverPreview(pendingEditCoverPreviewUrl, "変更予定");

    setBookEditError("");
}

function clearPendingCreateCover() {
    pendingCreateCoverPreviewUrl = releaseCoverPreviewUrl(pendingCreateCoverPreviewUrl);

    pendingCreateCoverFile = null;
}

function setPendingCreateCover(file) {
    clearPendingCreateCover();

    pendingCreateCoverFile = file;
    pendingCreateCoverPreviewUrl = URL.createObjectURL(file);
    showPendingCoverPreview(pendingCreateCoverPreviewUrl, "選択済み");
    setBookCreateError("");
}

function createBookProgressSection(book) {
    const section = document.createElement("section");
    const heading = document.createElement("div");
    const progressLabel = createTextElement("span", "detail-book__progress-label", "進捗");
    const form = document.createElement("form");
    const currentPageLabel = createTextElement("label", "visually-hidden", "現在ページ");
    const currentPageInput = document.createElement("input");
    const separator = createTextElement("span", "detail-book__progress-separator", "/");
    const totalPages = createTextElement(
        "span",
        "detail-book__progress-total",
        String(book.totalPages)
    );
    const updateButton = createTextElement("button", "detail-book__progress-update", "更新");
    const progressBar = document.createElement("span");
    const progressValue = document.createElement("span");
    const errorMessage = createTextElement("p", "detail-book__progress-error", "");
    const updatingStatus = createTextElement(
        "p",
        "detail-book__progress-status",
        "現在ページを更新しています…"
    );
    const progressPercentage = calculateProgressPercentage(book.currentPage, book.totalPages);

    section.className = "detail-book__progress detail-book__progress--view";
    section.setAttribute("aria-label", "読書の進捗");
    heading.className = "detail-book__progress-heading";

    form.id = "book-progress-form";
    form.className = "detail-book__progress-form";
    form.noValidate = true;
    form.addEventListener("submit", (event) => {
        requestBookProgressUpdate(event, book);
    });

    currentPageInput.id = "book-progress-current-page";
    currentPageInput.name = "currentPage";
    currentPageInput.className = "detail-book__progress-input";
    currentPageInput.type = "number";
    currentPageInput.min = "0";
    currentPageInput.max = String(book.totalPages);
    currentPageInput.step = "1";
    currentPageInput.required = true;
    currentPageInput.value = String(book.currentPage);
    currentPageInput.disabled = isDetailUpdateInProgress();
    currentPageLabel.htmlFor = currentPageInput.id;

    totalPages.setAttribute("aria-label", `総ページ数 ${book.totalPages}`);
    updateButton.id = "book-progress-update";
    updateButton.type = "submit";
    updateButton.disabled = isDetailUpdateInProgress();

    form.append(currentPageLabel, currentPageInput, separator, totalPages, updateButton);
    heading.append(progressLabel, form);

    progressBar.className = "detail-book__progress-bar";
    progressBar.setAttribute("role", "progressbar");
    progressBar.setAttribute("aria-valuemin", "0");
    progressBar.setAttribute("aria-valuemax", "100");
    progressBar.setAttribute("aria-valuenow", String(Math.round(progressPercentage)));
    progressBar.setAttribute("aria-valuetext", `${book.currentPage} / ${book.totalPages} ページ`);
    progressValue.className = "detail-book__progress-value";
    progressValue.style.width = `${progressPercentage}%`;
    progressBar.appendChild(progressValue);

    errorMessage.id = "book-progress-error";
    errorMessage.setAttribute("role", "alert");
    errorMessage.hidden = true;
    updatingStatus.id = "book-progress-status";
    updatingStatus.setAttribute("role", "status");
    updatingStatus.hidden = !isUpdatingProgress;

    section.append(heading, progressBar, errorMessage, updatingStatus);
    return section;
}

function createCompletionMetadataItem(book) {
    const item = document.createElement("div");
    const term = createTextElement("dt", "", "読了状態");
    const description = document.createElement("dd");
    const summary = document.createElement("div");
    const state = createTextElement(
        "span",
        "detail-book__completion",
        book.isCompleted ? "読了済み" : "未読了"
    );
    const actionButton = createTextElement(
        "button",
        book.isCompleted
            ? "detail-book__completion-button detail-book__completion-button--undo"
            : "detail-book__completion-button",
        book.isCompleted ? "読了解除" : "読了にする"
    );
    const errorMessage = createTextElement("p", "detail-book__completion-error", "");
    const updatingStatus = createTextElement("p", "detail-book__completion-status", "");

    item.className = "detail-book__metadata-item detail-book__metadata-item--completion";
    description.className = "detail-book__completion-control";
    summary.className = "detail-book__completion-summary";

    actionButton.id = "book-completion-action";
    actionButton.type = "button";
    actionButton.disabled = isDetailUpdateInProgress();
    actionButton.addEventListener("click", () => {
        requestBookCompletionChange(book);
    });

    if (isUpdatingCompletion) {
        actionButton.textContent = completionUpdateTarget
            ? "読了にしています…"
            : "読了解除しています…";
    }

    errorMessage.id = "book-completion-error";
    errorMessage.setAttribute("role", "alert");
    errorMessage.hidden = true;

    updatingStatus.id = "book-completion-status";
    updatingStatus.setAttribute("role", "status");
    updatingStatus.textContent = completionUpdateTarget
        ? "読了状態を更新しています…"
        : "読了状態を解除しています…";
    updatingStatus.hidden = !isUpdatingCompletion;

    summary.append(state, actionButton);
    description.append(summary, errorMessage, updatingStatus);
    item.append(term, description);
    return item;
}

function createBookDetail(book) {
    const article = document.createElement("article");
    const title = createTextElement("h3", "detail-book__title", book.title || "タイトル未設定");
    const progressSection = createBookProgressSection(book);
    const main = document.createElement("div");
    const visual = document.createElement("div");
    const metadata = document.createElement("dl");
    const footer = document.createElement("footer");
    const deleteButton = createTextElement("button", "detail-panel__delete", "削除");

    article.className = "detail-book";

    main.className = "detail-book__main";
    visual.className = "detail-book__visual";
    visual.append(createCoverUploadControl(book), createDetailFavoriteControl(book));

    metadata.className = "detail-book__metadata";
    metadata.append(
        createMetadataItem("ジャンル", getEnumLabel(book.genre, GENRE_LABELS, GENRE_NAME_LABELS)),
        createMetadataItem(
            "興味レベル",
            getEnumLabel(book.interestLevel, INTEREST_LEVEL_LABELS, INTEREST_LEVEL_NAME_LABELS)
        ),
        createCompletionMetadataItem(book),
        createMetadataItem(
            "最後に読んだ日",
            formatLastReadAt(book.lastReadAt),
            "detail-book__last-read"
        )
    );
    main.append(visual, metadata);

    footer.className = "detail-book__footer";
    deleteButton.type = "button";
    deleteButton.id = "book-detail-delete";
    deleteButton.disabled = isDetailUpdateInProgress();
    deleteButton.addEventListener("click", openBookDeleteDialog);
    footer.appendChild(deleteButton);

    article.append(title, progressSection, main, footer);
    return article;
}

function createEnumSelect(
    id,
    name,
    numericLabels,
    nameLabels,
    currentValue,
    placeholderText = ""
) {
    const select = document.createElement("select");
    const selectedValue = getEnumNumericValue(currentValue, numericLabels, nameLabels);

    select.id = id;
    select.name = name;
    select.className = "detail-book__select";
    select.required = true;

    if (placeholderText !== "") {
        const placeholder = document.createElement("option");

        placeholder.value = "";
        placeholder.textContent = placeholderText;
        placeholder.disabled = true;
        placeholder.selected = selectedValue === null;
        select.appendChild(placeholder);
    }

    for (const [value, label] of Object.entries(numericLabels)) {
        const option = document.createElement("option");

        option.value = value;
        option.textContent = label;
        option.selected = Number(value) === selectedValue;
        select.appendChild(option);
    }

    return select;
}

function createMetadataControlItem(label, control, helpText = "") {
    const item = document.createElement("div");
    const term = document.createElement("dt");
    const fieldLabel = createTextElement("label", "", label);
    const description = document.createElement("dd");

    item.className = "detail-book__metadata-item detail-book__metadata-item--editable";
    fieldLabel.htmlFor = control.id;
    term.appendChild(fieldLabel);
    description.appendChild(control);

    if (helpText !== "") {
        const help = createTextElement("p", "detail-book__field-help", helpText);

        help.id = `${control.id}-help`;
        control.setAttribute("aria-describedby", help.id);
        description.appendChild(help);
    }

    item.append(term, description);
    return item;
}

function createCompletionSelect(isCompleted) {
    const select = document.createElement("select");
    const options = [
        { value: "false", label: "未読了" },
        { value: "true", label: "読了済み" }
    ];

    select.id = "book-edit-completion";
    select.name = "isCompleted";
    select.className = "detail-book__select";
    select.required = true;

    for (const optionDefinition of options) {
        const option = document.createElement("option");

        option.value = optionDefinition.value;
        option.textContent = optionDefinition.label;
        option.selected = optionDefinition.value === String(Boolean(isCompleted));
        select.appendChild(option);
    }

    return select;
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
    const completionSelect = createCompletionSelect(book.isCompleted);
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

    metadata.className = "detail-book__metadata detail-book__metadata--editing";
    metadata.append(
        createMetadataControlItem("ジャンル", genreSelect),
        createMetadataControlItem("興味レベル", interestLevelSelect),
        createMetadataControlItem(
            "読了状態",
            completionSelect,
            "「読了済み」を選ぶと、保存時に現在ページが総ページ数へ進みます。"
        ),
        createMetadataItem(
            "最後に読んだ日",
            formatLastReadAt(book.lastReadAt),
            "detail-book__last-read"
        )
    );
    main.append(
        createCoverUploadControl(book, {
            imageSource: pendingEditCoverPreviewUrl ?? getCoverImagePath(book.coverImagePath),
            isChangePending: pendingEditCoverFile !== null,
            showUploadFeedback: false,
            onFileSelected: setPendingEditCover
        }),
        metadata
    );

    errorMessage.id = "book-edit-error";
    errorMessage.setAttribute("role", "alert");
    errorMessage.hidden = true;
    savingStatus.id = "book-saving-status";
    savingStatus.setAttribute("role", "status");
    savingStatus.hidden = true;

    form.append(titleField, progressSection, main, errorMessage, savingStatus);
    return form;
}

function createBookFormField(labelText, control, helpText = "") {
    const field = document.createElement("div");
    const label = createTextElement("label", "detail-book__field-label", labelText);

    field.className = "detail-book__field";
    label.htmlFor = control.id;
    field.append(label, control);

    if (helpText !== "") {
        const help = createTextElement("p", "detail-book__field-help", helpText);

        help.id = `${control.id}-help`;
        control.setAttribute("aria-describedby", help.id);
        field.appendChild(help);
    }

    return field;
}

function createBookCreationForm() {
    const form = document.createElement("form");
    const introduction = createTextElement(
        "p",
        "detail-book__create-introduction",
        "各項目を入力・選択して、「登録」を押してください。"
    );
    const coverField = document.createElement("div");
    const coverFieldLabel = createTextElement("p", "detail-book__field-label", "表紙（任意）");
    const fields = document.createElement("div");
    const titleInput = document.createElement("input");
    const totalPagesInput = document.createElement("input");
    const genreSelect = createEnumSelect(
        "book-create-genre",
        "genre",
        GENRE_LABELS,
        GENRE_NAME_LABELS,
        null,
        "ジャンルを選択してください"
    );
    const interestLevelSelect = createEnumSelect(
        "book-create-interest-level",
        "interestLevel",
        INTEREST_LEVEL_LABELS,
        INTEREST_LEVEL_NAME_LABELS,
        null,
        "興味レベルを選択してください"
    );
    const errorMessage = createTextElement("p", "detail-book__edit-error", "");
    const registeringStatus = createTextElement(
        "p",
        "detail-book__saving-status",
        "本を登録しています…"
    );

    form.id = "book-create-form";
    form.className = "detail-book detail-book--creating";
    form.setAttribute("aria-describedby", "book-create-introduction");
    form.addEventListener("submit", registerBook);

    introduction.id = "book-create-introduction";
    coverField.className = "detail-book__field detail-book__create-cover";
    fields.className = "detail-book__create-fields";

    titleInput.id = "book-create-title";
    titleInput.name = "title";
    titleInput.className = "detail-book__input";
    titleInput.type = "text";
    titleInput.autocomplete = "off";
    titleInput.required = true;
    titleInput.maxLength = 100;

    totalPagesInput.id = "book-create-total-pages";
    totalPagesInput.name = "totalPages";
    totalPagesInput.className = "detail-book__input";
    totalPagesInput.type = "number";
    totalPagesInput.min = "1";
    totalPagesInput.max = "10000";
    totalPagesInput.step = "1";
    totalPagesInput.required = true;

    fields.append(
        createBookFormField("タイトル", titleInput, "100文字以内で入力してください。"),
        createBookFormField("総ページ数", totalPagesInput, "1〜10000ページで入力してください。"),
        createBookFormField("ジャンル", genreSelect),
        createBookFormField("興味レベル", interestLevelSelect)
    );

    coverField.append(
        coverFieldLabel,
        createCoverUploadControl(
            { title: "新しい本", coverImagePath: null },
            {
                imageSource: pendingCreateCoverPreviewUrl ?? DEFAULT_COVER_IMAGE_PATH,
                isChangePending: pendingCreateCoverFile !== null,
                pendingLabelText: "選択済み",
                showUploadFeedback: false,
                onFileSelected: setPendingCreateCover
            }
        )
    );

    errorMessage.id = "book-create-error";
    errorMessage.setAttribute("role", "alert");
    errorMessage.hidden = true;
    registeringStatus.id = "book-registering-status";
    registeringStatus.setAttribute("role", "status");
    registeringStatus.hidden = true;

    form.append(introduction, coverField, fields, errorMessage, registeringStatus);
    return form;
}

function captureBookCardLayout() {
    const cardLayout = new Map();

    for (const item of bookList.querySelectorAll(".book-grid__item")) {
        const bookId = item.querySelector(".book-card")?.dataset.bookId;

        if (bookId !== undefined) {
            cardLayout.set(bookId, item.getBoundingClientRect());
        }
    }

    return cardLayout;
}

function cancelBookListLayoutAnimation() {
    if (bookListLayoutAnimationFrame !== null) {
        cancelAnimationFrame(bookListLayoutAnimationFrame);
        bookListLayoutAnimationFrame = null;
    }

    for (const cleanup of [...bookListLayoutAnimationCleanups]) {
        cleanup();
    }
}

function animateBookListLayout(isPanelOpen, onPlay) {
    const firstLayout = captureBookCardLayout();

    cancelBookListLayoutAnimation();
    workspace.classList.toggle("workspace--detail-open", isPanelOpen);

    const lastLayout = captureBookCardLayout();
    const animatedItems = [];

    for (const item of bookList.querySelectorAll(".book-grid__item")) {
        const bookId = item.querySelector(".book-card")?.dataset.bookId;
        const firstRect = bookId === undefined ? null : firstLayout.get(bookId);

        if (firstRect === null || firstRect === undefined) {
            continue;
        }

        const lastRect = bookId === undefined ? null : lastLayout.get(bookId);

        if (lastRect === null || lastRect === undefined) {
            continue;
        }

        const translateX = firstRect.left - lastRect.left;
        const translateY = firstRect.top - lastRect.top;

        if (Math.abs(translateX) < 0.5 && Math.abs(translateY) < 0.5) {
            continue;
        }

        item.classList.add("book-grid__item--layout-animating");
        item.style.transition = "none";
        item.style.transform = `translate(${translateX}px, ${translateY}px)`;
        animatedItems.push(item);
    }

    bookList.getBoundingClientRect();

    bookListLayoutAnimationFrame = requestAnimationFrame(() => {
        bookListLayoutAnimationFrame = null;
        onPlay();

        for (const item of animatedItems) {
            const finishAnimation = (event) => {
                if (event.target !== item || event.propertyName !== "transform") {
                    return;
                }

                cleanup();
            };
            const cleanup = () => {
                item.removeEventListener("transitionend", finishAnimation);
                item.removeEventListener("transitioncancel", finishAnimation);
                item.classList.remove("book-grid__item--layout-animating");
                item.style.removeProperty("transition");
                item.style.removeProperty("transform");
                bookListLayoutAnimationCleanups.delete(cleanup);
            };

            bookListLayoutAnimationCleanups.add(cleanup);
            item.addEventListener("transitionend", finishAnimation);
            item.addEventListener("transitioncancel", finishAnimation);
            item.style.removeProperty("transition");
            item.style.removeProperty("transform");
        }
    });
}

function cancelHelpPanelOpenAnimation() {
    if (helpPanelAnimationFrame !== null) {
        cancelAnimationFrame(helpPanelAnimationFrame);
        helpPanelAnimationFrame = null;
    }
}

function openHelpPanel() {
    cancelHelpPanelOpenAnimation();

    if (helpPanelCloseCleanup !== null) {
        helpPanelCloseCleanup();
        helpPanelCloseCleanup = null;
    }

    if (!helpPanel.hidden && helpPanel.classList.contains("help-panel--open")) {
        helpPanelCloseButton.focus({ preventScroll: true });
        return;
    }

    helpPanel.hidden = false;
    helpPanel.classList.remove("help-panel--open");
    helpButton.setAttribute("aria-expanded", "true");
    helpPanelAnimationFrame = requestAnimationFrame(() => {
        helpPanelAnimationFrame = null;

        if (!helpPanel.hidden) {
            helpPanel.classList.add("help-panel--open");
        }
    });
    helpPanelCloseButton.focus({ preventScroll: true });
}

function closeHelpPanel(restoreButtonFocus = true) {
    if (helpPanel.hidden || helpPanelCloseCleanup !== null) {
        return;
    }

    cancelHelpPanelOpenAnimation();
    helpButton.setAttribute("aria-expanded", "false");

    const finishClosing = (event) => {
        if (event.target !== helpPanel || event.propertyName !== "transform") {
            return;
        }

        helpPanelCloseCleanup();
        helpPanelCloseCleanup = null;
        helpPanel.hidden = true;

        if (restoreButtonFocus) {
            helpButton.focus({ preventScroll: true });
        }
    };

    if (!helpPanel.classList.contains("help-panel--open")) {
        helpPanel.hidden = true;

        if (restoreButtonFocus) {
            helpButton.focus({ preventScroll: true });
        }
        return;
    }

    helpPanelCloseCleanup = () => {
        helpPanel.removeEventListener("transitionend", finishClosing);
        helpPanel.removeEventListener("transitioncancel", finishClosing);
    };
    helpPanel.addEventListener("transitionend", finishClosing);
    helpPanel.addEventListener("transitioncancel", finishClosing);
    helpPanel.classList.remove("help-panel--open");
}

function openBookDetailPanel() {
    if (detailPanelCloseCleanup !== null) {
        detailPanelCloseCleanup();
        detailPanelCloseCleanup = null;
    }

    if (!bookDetailPanel.hidden
        && bookDetailPanel.classList.contains("detail-panel--open")) {
        return;
    }

    bookDetailPanel.hidden = false;
    bookDetailPanel.classList.remove("detail-panel--open");
    animateBookListLayout(true, () => {
        bookDetailPanel.classList.add("detail-panel--open");
    });
}

function closeBookDetailPanelWithAnimation(onClosed) {
    if (bookDetailPanel.hidden || detailPanelCloseCleanup !== null) {
        return;
    }

    if (!bookDetailPanel.classList.contains("detail-panel--open")) {
        cancelBookListLayoutAnimation();
        workspace.classList.remove("workspace--detail-open");
        bookDetailPanel.hidden = true;
        onClosed();
        return;
    }

    const finishClosing = (event) => {
        if (event.target !== bookDetailPanel || event.propertyName !== "transform") {
            return;
        }

        detailPanelCloseCleanup();
        detailPanelCloseCleanup = null;

        if (!bookDetailPanel.classList.contains("detail-panel--open")) {
            bookDetailPanel.hidden = true;
            onClosed();
        }
    };

    detailPanelCloseCleanup = () => {
        bookDetailPanel.removeEventListener("transitionend", finishClosing);
    };
    bookDetailPanel.addEventListener("transitionend", finishClosing);
    animateBookListLayout(false, () => {
        bookDetailPanel.classList.remove("detail-panel--open");
    });
}

function setDetailActionsUnavailable() {
    bookDetailPanel.classList.remove("detail-panel--editing", "detail-panel--creating");
    bookDetailEditButton.textContent = "編集";
    bookDetailEditButton.classList.remove("detail-panel__edit--save");
    bookDetailEditButton.disabled = true;
    bookDetailCancelButton.hidden = true;
    bookDetailCancelButton.disabled = false;
    bookDetailCloseButton.disabled = isDetailUpdateInProgress();
}

function setDetailActionsForView() {
    bookDetailHeading.textContent = "本の詳細";
    bookDetailPanel.classList.remove("detail-panel--editing", "detail-panel--creating");
    bookDetailEditButton.textContent = "編集";
    bookDetailEditButton.classList.remove("detail-panel__edit--save");
    bookDetailEditButton.disabled = currentBookDetail === null || isDetailUpdateInProgress();
    bookDetailCancelButton.hidden = true;
    bookDetailCancelButton.disabled = false;
    bookDetailCloseButton.disabled = isDetailUpdateInProgress();
}

function setDetailActionsForEdit() {
    bookDetailHeading.textContent = "本の詳細";
    bookDetailPanel.classList.add("detail-panel--editing");
    bookDetailPanel.classList.remove("detail-panel--creating");
    bookDetailEditButton.textContent = "保存";
    bookDetailEditButton.classList.add("detail-panel__edit--save");
    bookDetailEditButton.disabled = false;
    bookDetailCancelButton.hidden = false;
    bookDetailCancelButton.disabled = false;
    bookDetailCloseButton.disabled = false;
}

function setDetailActionsForCreate() {
    bookDetailHeading.textContent = "本を追加";
    bookDetailPanel.classList.remove("detail-panel--editing");
    bookDetailPanel.classList.add("detail-panel--creating");
    bookDetailEditButton.textContent = "登録";
    bookDetailEditButton.classList.add("detail-panel__edit--save");
    bookDetailEditButton.disabled = false;
    bookDetailCancelButton.hidden = false;
    bookDetailCancelButton.disabled = false;
    bookDetailCloseButton.disabled = false;
}

function clearEditingState() {
    clearPendingEditCover();
    editingBookId = null;
    editBookSnapshot = null;
    isSavingBook = false;
    bookDetailPanel.setAttribute("aria-busy", "false");
}

function clearCreatingState() {
    clearPendingCreateCover();
    isCreatingBook = false;
    isRegisteringBook = false;
    createBookReturnState = null;
    addBookButton.disabled = false;
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
    if (currentBookDetail === null || isCreatingBook || isDetailUpdateInProgress()) {
        return;
    }

    clearPendingEditCover();
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

function startBookCreation() {
    const returnBookId = selectedBookId;
    const returnBook = currentBookDetail === null ? null : { ...currentBookDetail };

    if (bookDetailAbortController !== null) {
        bookDetailAbortController.abort();
        bookDetailAbortController = null;
    }

    clearEditingState();
    clearPendingCreateCover();
    createBookReturnState = returnBookId === null
        ? null
        : { bookId: returnBookId, book: returnBook };
    currentBookDetail = null;
    isCreatingBook = true;
    bookDetailContent.replaceChildren(createBookCreationForm());
    openBookDetailPanel();
    setDetailActionsForCreate();
    document.getElementById("book-create-title")?.focus();
}

function requestStartBookCreation() {
    if (isDetailUpdateInProgress()) {
        return;
    }

    if (isCreatingBook) {
        document.getElementById("book-create-title")?.focus();
        return;
    }

    if (!confirmDiscardUnsavedPanelChanges(
        "編集中の変更内容は保存されません。本の新規登録へ移りますか？"
    )) {
        return;
    }

    startBookCreation();
}

function cancelBookCreation() {
    if (!isCreatingBook || isRegisteringBook) {
        return;
    }

    const returnState = createBookReturnState;

    document.getElementById("book-create-form")?.reset();
    clearCreatingState();

    if (returnState?.book !== null && returnState?.book !== undefined) {
        setSelectedBook(returnState.bookId);
        renderBookDetail(returnState.book);
        bookDetailEditButton.focus();
        return;
    }

    if (returnState?.bookId !== undefined) {
        showBookDetail(returnState.bookId);
        return;
    }

    closeBookDetailPanel();
    addBookButton.focus();
}

function hasGeneralBookEdits(form, book) {
    const genre = getEnumNumericValue(
        book.genre,
        GENRE_LABELS,
        GENRE_NAME_LABELS
    );
    const interestLevel = getEnumNumericValue(
        book.interestLevel,
        INTEREST_LEVEL_LABELS,
        INTEREST_LEVEL_NAME_LABELS
    );

    return form.elements.title.value !== String(book.title ?? "")
        || form.elements.currentPage.value !== String(book.currentPage)
        || form.elements.totalPages.value !== String(book.totalPages)
        || form.elements.genre.value !== String(genre)
        || form.elements.interestLevel.value !== String(interestLevel);
}

function getSelectedCompletionState(form) {
    return form.elements.isCompleted.value === "true";
}

function hasUnsavedBookEdits() {
    const form = document.getElementById("book-edit-form");

    if (editingBookId === null || editBookSnapshot === null || form === null) {
        return false;
    }

    return hasGeneralBookEdits(form, editBookSnapshot)
        || getSelectedCompletionState(form) !== Boolean(editBookSnapshot.isCompleted)
        || pendingEditCoverFile !== null;
}

function hasUnsavedBookCreationInput() {
    const form = document.getElementById("book-create-form");

    if (!isCreatingBook || form === null) {
        return false;
    }

    return form.elements.title.value !== ""
        || form.elements.totalPages.value !== ""
        || form.elements.genre.value !== ""
        || form.elements.interestLevel.value !== ""
        || pendingCreateCoverFile !== null;
}

function hasUnsavedPanelChanges() {
    return hasUnsavedBookEdits() || hasUnsavedBookCreationInput();
}

function confirmDiscardUnsavedPanelChanges(message) {
    return !hasUnsavedPanelChanges() || window.confirm(message);
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

    bookDetailPanel.setAttribute("aria-busy", "false");
    currentBookDetail = null;
    clearEditingState();
    clearCreatingState();
    setSelectedBook(null);

    closeBookDetailPanelWithAnimation(() => {
        bookDetailContent.replaceChildren();
        setDetailActionsUnavailable();
    });

    if (restoreCardFocus && selectedCard !== null) {
        selectedCard.focus();
    }
}

function requestCloseBookDetailPanel(restoreCardFocus = false) {
    if (isDetailUpdateInProgress()) {
        return;
    }

    const discardMessage = isCreatingBook
        ? "入力中の内容は登録されません。詳細パネルを閉じますか？"
        : "編集中の変更内容は保存されません。詳細パネルを閉じますか？";

    if (!confirmDiscardUnsavedPanelChanges(discardMessage)) {
        return;
    }

    closeBookDetailPanel(restoreCardFocus);
}

function requestBookSelection(bookId) {
    const normalizedBookId = String(bookId);

    if (isDetailUpdateInProgress()
        || (editingBookId !== null && normalizedBookId === editingBookId)) {
        return;
    }

    const discardMessage = isCreatingBook
        ? "入力中の内容は登録されません。選択した本を表示しますか？"
        : "編集中の変更内容は保存されません。別の本を表示しますか？";

    if (!confirmDiscardUnsavedPanelChanges(discardMessage)) {
        return;
    }

    clearCreatingState();
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
    bookDetailHeading.textContent = "本の詳細";
    setDetailActionsUnavailable();
    setSelectedBook(normalizedBookId);
    openBookDetailPanel();
    bookDetailPanel.setAttribute("aria-busy", "true");
    showBookDetailMessage("本の詳細を読み込んでいます…", "loading");

    try {
        const book = await fetchBookDetail(normalizedBookId, requestController.signal);

        if (isCreatingBook || selectedBookId !== normalizedBookId) {
            return;
        }

        renderBookDetail(book);
    } catch (error) {
        if (error.name === "AbortError"
            || isCreatingBook
            || selectedBookId !== normalizedBookId) {
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

function setBookCreateError(message) {
    const errorMessage = document.getElementById("book-create-error");

    if (errorMessage === null) {
        return;
    }

    errorMessage.textContent = message;
    errorMessage.hidden = message === "";
}

function setBookRegisteringState(isRegistering) {
    const form = document.getElementById("book-create-form");
    const registeringStatus = document.getElementById("book-registering-status");

    isRegisteringBook = isRegistering;
    bookDetailPanel.setAttribute("aria-busy", String(isRegistering));
    bookDetailEditButton.textContent = isRegistering ? "登録中…" : "登録";
    bookDetailEditButton.disabled = isRegistering;
    bookDetailCancelButton.disabled = isRegistering;
    bookDetailCloseButton.disabled = isRegistering;
    addBookButton.disabled = isRegistering;

    if (form !== null) {
        for (const control of form.elements) {
            control.disabled = isRegistering;
        }
    }

    if (registeringStatus !== null) {
        registeringStatus.hidden = !isRegistering;
    }
}

function createBookPayload(form) {
    return {
        title: form.elements.title.value,
        totalPages: form.elements.totalPages.valueAsNumber,
        genre: Number(form.elements.genre.value),
        interestLevel: Number(form.elements.interestLevel.value),
        coverImagePath: null
    };
}

async function createBook(createPayload) {
    const response = await fetch(BOOKS_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(createPayload)
    });

    if (!response.ok) {
        const error = new Error(`POST ${BOOKS_API_URL} failed: ${response.status}`);

        error.status = response.status;
        error.apiMessage = await readApiErrorMessage(response);
        throw error;
    }

    let responseText = "";

    try {
        responseText = (await response.text()).trim();
    } catch {
        return null;
    }

    if (responseText === "") {
        return null;
    }

    try {
        const createdBook = JSON.parse(responseText);

        return createdBook !== null && typeof createdBook === "object" && !Array.isArray(createdBook)
            ? createdBook
            : null;
    } catch {
        return null;
    }
}

function getCreatedBookId(createdBook) {
    const bookId = Number(createdBook?.id);

    return Number.isInteger(bookId) && bookId > 0 ? String(bookId) : null;
}

function getCreateFailureMessage(error) {
    if (error.status === 400) {
        return error.apiMessage
            ? `本を登録できませんでした。${error.apiMessage}`
            : "本を登録できませんでした。入力内容を確認してください。";
    }

    if (error.status === 404) {
        return "登録先が見つかりませんでした。ページを再読み込みして再度お試しください。";
    }

    return "本を登録できませんでした。入力内容は残っています。時間をおいて再度お試しください。";
}

async function registerBook(event) {
    event.preventDefault();

    const form = event.currentTarget;

    if (!isCreatingBook || isRegisteringBook || !form.reportValidity()) {
        return;
    }

    const createPayload = createBookPayload(form);
    const selectedCoverFile = pendingCreateCoverFile;
    let bookWasCreated = false;
    let createdBookId = null;
    let coverUploadCompleted = false;

    setBookCreateError("");
    setBookRegisteringState(true);

    try {
        const createdBook = await createBook(createPayload);

        bookWasCreated = true;

        createdBookId = getCreatedBookId(createdBook);

        if (selectedCoverFile !== null) {
            if (createdBookId === null) {
                const error = new Error("Created book ID was not returned by POST /api/books.");

                error.code = "created-book-id-unavailable";
                throw error;
            }

            await uploadBookCover(createdBookId, selectedCoverFile);
            coverUploadCompleted = true;
        }

        const books = await fetchBooks();
        const createdBookIsVisible = createdBookId !== null
            && containsBookId(books, createdBookId);

        updateBookList(books);
        form.reset();
        setBookRegisteringState(false);
        clearCreatingState();

        if (createdBookIsVisible) {
            await showBookDetail(createdBookId);
            return;
        }

        closeBookDetailPanel();
        addBookButton.focus();
    } catch (error) {
        if (!bookWasCreated) {
            console.error("本を登録できませんでした。", error);
            setBookRegisteringState(false);
            setBookCreateError(getCreateFailureMessage(error));
            return;
        }

        const coverUploadFailed = selectedCoverFile !== null && !coverUploadCompleted;
        const coverFailureMessage = error.code === "created-book-id-unavailable"
            ? "本は登録されましたが、表紙画像の設定に必要なBook IDを取得できませんでした。"
            : `本は登録されましたが、表紙画像の設定に失敗しました。${getCoverUploadFailureMessage(error)}`;

        try {
            const books = await fetchBooks();
            const createdBookIsVisible = createdBookId !== null
                && containsBookId(books, createdBookId);

            updateBookList(books);
            form.reset();
            setBookRegisteringState(false);
            clearCreatingState();

            if (coverUploadFailed) {
                if (createdBookIsVisible) {
                    await showBookDetail(createdBookId);
                    setCompletionActionError(coverFailureMessage);
                    return;
                }

                setDetailActionsUnavailable();
                showBookDetailMessage(coverFailureMessage, "error");
                return;
            }

            if (createdBookIsVisible) {
                await showBookDetail(createdBookId);
                return;
            }

            closeBookDetailPanel();
            addBookButton.focus();
        } catch (refreshError) {
            console.error("本の登録後に一覧を再取得できませんでした。", refreshError);
            form.reset();
            setBookRegisteringState(false);
            clearCreatingState();
            closeBookDetailPanel();
            showListMessage(
                coverUploadFailed
                    ? `${coverFailureMessage} また、一覧の最新情報を取得できませんでした。ページを再読み込みしてください。`
                    : "本は登録されましたが、一覧の最新情報を取得できませんでした。ページを再読み込みしてください。",
                "error"
            );
            updateResultCount(null);
            addBookButton.focus();
        }
    }
}

function setCompletionActionError(message) {
    const errorMessage = document.getElementById("book-completion-error");

    if (errorMessage === null) {
        return;
    }

    errorMessage.textContent = message;
    errorMessage.hidden = message === "";
}

function setProgressActionError(message) {
    const errorMessage = document.getElementById("book-progress-error");

    if (errorMessage === null) {
        return;
    }

    errorMessage.textContent = message;
    errorMessage.hidden = message === "";
}

function setBookListActionError(message) {
    bookListActionError.textContent = message;
    bookListActionError.hidden = message === "";
}

function clearFavoriteActionErrors() {
    const detailError = document.getElementById("book-favorite-error");

    setBookListActionError("");

    if (detailError !== null) {
        detailError.textContent = "";
        detailError.hidden = true;
    }
}

function showFavoriteActionError(message, source) {
    const detailError = document.getElementById("book-favorite-error");

    if (source === "detail" && detailError !== null) {
        detailError.textContent = message;
        detailError.hidden = false;
        return;
    }

    setBookListActionError(message);
}

function setDetailViewControlsDisabled(isDisabled) {
    const progressInput = document.getElementById("book-progress-current-page");
    const progressButton = document.getElementById("book-progress-update");
    const completionButton = document.getElementById("book-completion-action");
    const favoriteButton = document.getElementById("book-detail-favorite");
    const coverButton = document.getElementById("book-cover-select");
    const coverInput = document.getElementById("book-cover-file");
    const deleteButton = document.getElementById("book-detail-delete");

    if (progressInput !== null) {
        progressInput.disabled = isDisabled;
    }

    if (progressButton !== null) {
        progressButton.disabled = isDisabled;
    }

    if (completionButton !== null) {
        completionButton.disabled = isDisabled;
    }

    if (favoriteButton !== null) {
        favoriteButton.disabled = isDisabled;
    }

    if (coverButton !== null) {
        coverButton.disabled = isDisabled;
    }

    if (coverInput !== null) {
        coverInput.disabled = isDisabled;
    }

    if (deleteButton !== null) {
        deleteButton.disabled = isDisabled;
    }
}

function setBookDeleteError(message) {
    bookDeleteError.textContent = message;
    bookDeleteError.hidden = message === "";
}

function setBookDeletingState(isDeleting) {
    isDeletingBook = isDeleting;
    bookDeleteDialog.setAttribute("aria-busy", String(isDeleting));
    bookDetailPanel.setAttribute("aria-busy", String(isDeleting));
    bookDeleteCancelButton.disabled = isDeleting;
    bookDeleteConfirmButton.disabled = isDeleting;
    bookDeleteConfirmButton.textContent = isDeleting ? "削除中…" : "削除する";
    bookDeleteStatus.hidden = !isDeleting;
    bookDetailEditButton.disabled = isDeleting || currentBookDetail === null;
    bookDetailCloseButton.disabled = isDeleting;
    setDetailViewControlsDisabled(isDeleting);
}

function openBookDeleteDialog() {
    if (currentBookDetail === null
        || editingBookId !== null
        || isDetailUpdateInProgress()
        || String(currentBookDetail.id) !== selectedBookId) {
        return;
    }

    deleteDialogReturnFocus = document.activeElement;
    bookDeleteHeading.textContent = `「${currentBookDetail.title || "タイトル未設定"}」を削除しますか？`;
    setBookDeleteError("");
    setBookDeletingState(false);
    bookDeleteDialog.showModal();
    bookDeleteCancelButton.focus();
}

function closeBookDeleteDialog(restoreFocus = true) {
    if (isDeletingBook || !bookDeleteDialog.open) {
        return;
    }

    bookDeleteDialog.close();
    setBookDeleteError("");
    bookDeleteStatus.hidden = true;

    if (restoreFocus && deleteDialogReturnFocus?.isConnected) {
        deleteDialogReturnFocus.focus();
    }

    deleteDialogReturnFocus = null;
}

async function deleteBook(bookId) {
    const bookApiUrl = getBookApiUrl(bookId);
    const response = await fetch(bookApiUrl, { method: "DELETE" });

    if (!response.ok) {
        const error = new Error(`DELETE ${bookApiUrl} failed: ${response.status}`);

        error.status = response.status;
        error.apiMessage = await readApiErrorMessage(response);
        throw error;
    }
}

function getDeleteFailureMessage(error) {
    if (error.status === 404) {
        return "この本はすでに存在しない可能性があります。一覧を更新してから再度お試しください。";
    }

    if (error.status === 400 && error.apiMessage) {
        return `本を削除できませんでした。${error.apiMessage}`;
    }

    return "本を削除できませんでした。時間をおいて再度お試しください。";
}

async function confirmBookDeletion() {
    if (isDeletingBook || currentBookDetail === null || editingBookId !== null) {
        return;
    }

    const bookId = String(currentBookDetail.id);
    let bookDeleted = false;

    setBookDeleteError("");
    setBookDeletingState(true);

    try {
        await deleteBook(bookId);
        bookDeleted = true;

        const books = await fetchBooks();

        updateBookList(books);
        setBookDeletingState(false);
        closeBookDeleteDialog(false);
        closeBookDetailPanel();
        bookList.querySelector(".book-card")?.focus();
    } catch (error) {
        console.error(
            bookDeleted
                ? "本の削除後に一覧を再取得できませんでした。"
                : "本を削除できませんでした。",
            error
        );
        setBookDeletingState(false);

        if (bookDeleted) {
            closeBookDeleteDialog(false);
            closeBookDetailPanel();
            showListMessage(
                "本は削除されましたが、一覧の最新情報を取得できませんでした。ページを再読み込みしてください。",
                "error"
            );
            updateResultCount(null);
            return;
        }

        setBookDeleteError(getDeleteFailureMessage(error));
        bookDeleteConfirmButton.focus();
    }
}

function setCompletionUpdatingState(isUpdating, targetState = null) {
    const actionButton = document.getElementById("book-completion-action");
    const updatingStatus = document.getElementById("book-completion-status");

    isUpdatingCompletion = isUpdating;
    completionUpdateTarget = isUpdating ? targetState : null;
    bookDetailPanel.setAttribute("aria-busy", String(isUpdating));
    bookDetailEditButton.disabled = isUpdating || currentBookDetail === null;
    bookDetailCloseButton.disabled = isUpdating;
    setDetailViewControlsDisabled(isUpdating);

    if (actionButton !== null) {
        actionButton.disabled = isUpdating;
        actionButton.textContent = isUpdating
            ? (targetState ? "読了にしています…" : "読了解除しています…")
            : (currentBookDetail?.isCompleted ? "読了解除" : "読了にする");
    }

    if (updatingStatus !== null) {
        updatingStatus.textContent = targetState
            ? "読了状態を更新しています…"
            : "読了状態を解除しています…";
        updatingStatus.hidden = !isUpdating;
    }
}

function setFavoriteUpdatingState(bookId, isUpdating) {
    const normalizedBookId = String(bookId);

    favoriteUpdateBookId = isUpdating ? normalizedBookId : null;

    for (const button of document.querySelectorAll("[data-favorite-book-id]")) {
        if (button.dataset.favoriteBookId !== normalizedBookId) {
            continue;
        }

        const bookTitle = button.dataset.favoriteTitle || "この本";

        button.disabled = isUpdating;
        button.setAttribute(
            "aria-label",
            isUpdating
                ? `${bookTitle}のお気に入り状態を更新中`
                : button.title
        );
    }

    const isSelectedBook = selectedBookId === normalizedBookId
        && !bookDetailPanel.hidden
        && !isCreatingBook;

    if (isSelectedBook) {
        bookDetailPanel.setAttribute("aria-busy", String(isUpdating));
        bookDetailEditButton.disabled = isUpdating || currentBookDetail === null;
        bookDetailCloseButton.disabled = isUpdating;
        setDetailViewControlsDisabled(isUpdating);
    }

    const updatingStatus = document.getElementById("book-favorite-status");
    if (updatingStatus !== null) {
        updatingStatus.hidden = !isUpdating;
    }
}

function setProgressUpdatingState(isUpdating) {
    const updateButton = document.getElementById("book-progress-update");
    const updatingStatus = document.getElementById("book-progress-status");

    isUpdatingProgress = isUpdating;
    bookDetailPanel.setAttribute("aria-busy", String(isUpdating));
    bookDetailEditButton.disabled = isUpdating || currentBookDetail === null;
    bookDetailCloseButton.disabled = isUpdating;
    setDetailViewControlsDisabled(isUpdating);

    if (updateButton !== null) {
        updateButton.textContent = isUpdating ? "更新中…" : "更新";
    }

    if (updatingStatus !== null) {
        updatingStatus.hidden = !isUpdating;
    }
}

function setCoverUploadError(message) {
    const errorMessage = document.getElementById("book-cover-error");

    if (errorMessage === null) {
        return;
    }

    errorMessage.textContent = message;
    errorMessage.hidden = message === "";
}

function setCoverUploadingState(isUploading) {
    const selectButton = document.getElementById("book-cover-select");
    const uploadingStatus = document.getElementById("book-cover-status");

    isUploadingCover = isUploading;
    bookDetailPanel.setAttribute("aria-busy", String(isUploading));
    bookDetailEditButton.disabled = isUploading || currentBookDetail === null;
    bookDetailCloseButton.disabled = isUploading;
    setDetailViewControlsDisabled(isUploading);

    if (selectButton !== null) {
        selectButton.disabled = isUploading;
    }

    if (uploadingStatus !== null) {
        uploadingStatus.hidden = !isUploading;
    }
}

async function uploadBookCover(bookId, file) {
    const coverApiUrl = getBookCoverApiUrl(bookId);
    const formData = new FormData();

    formData.append("file", file);

    const response = await fetch(coverApiUrl, {
        method: "POST",
        body: formData
    });

    if (!response.ok) {
        const error = new Error(`POST ${coverApiUrl} failed: ${response.status}`);

        error.status = response.status;
        error.apiMessage = await readApiErrorMessage(response);
        throw error;
    }
}

function getCoverUploadFailureMessage(error) {
    if (error.status === 400) {
        return error.apiMessage || "表紙画像をアップロードできませんでした。画像ファイルを確認してください。";
    }

    if (error.status === 404) {
        return "この本は見つかりませんでした。すでに削除された可能性があります。";
    }

    return "表紙画像をアップロードできませんでした。時間をおいて再度お試しください。";
}

function getCoverRefreshFailureMessage(detailError, listError) {
    if (detailError !== null && listError !== null) {
        return "表紙は変更されましたが、詳細と一覧の最新情報を再取得できませんでした。ページを再読み込みしてください。";
    }

    if (detailError !== null) {
        return detailError.status === 404
            ? "表紙は変更されましたが、この本の最新情報を取得できませんでした。一覧を更新して再度お試しください。"
            : "表紙は変更されましたが、詳細の最新情報を再取得できませんでした。本を選び直してください。";
    }

    return "表紙は変更され、詳細を更新しましたが、一覧の最新情報を再取得できませんでした。ページを再読み込みしてください。";
}

async function requestBookCoverUpload(book, file) {
    if (isDetailUpdateInProgress()
        || editingBookId !== null
        || String(book.id) !== selectedBookId) {
        return;
    }

    const bookId = String(book.id);
    let coverUpdated = false;
    let refreshCompleted = false;

    setCoverUploadError("");
    setCoverUploadingState(true);

    try {
        await uploadBookCover(bookId, file);
        coverUpdated = true;

        const { detailError, listError } = await refreshBookViews(bookId);

        if (detailError !== null || listError !== null) {
            console.error("表紙の変更後に最新情報を再取得できませんでした。", {
                detailError,
                listError
            });
            setCoverUploadError(getCoverRefreshFailureMessage(detailError, listError));
            return;
        }

        refreshCompleted = true;
    } catch (error) {
        if (coverUpdated) {
            console.error("表紙の変更後に最新情報を画面へ反映できませんでした。", error);
            setCoverUploadError(
                "表紙は変更されましたが、最新情報を画面へ反映できませんでした。ページを再読み込みしてください。"
            );
        } else {
            console.error("表紙画像をアップロードできませんでした。", error);
            setCoverUploadError(getCoverUploadFailureMessage(error));
        }
    } finally {
        setCoverUploadingState(false);
    }

    if (refreshCompleted) {
        document.getElementById("book-cover-select")?.focus();
    }
}

function getProgressInputError(currentPage, totalPages) {
    if (!Number.isInteger(currentPage) || currentPage < 0) {
        return "現在ページは0以上の整数で入力してください。";
    }

    if (currentPage > totalPages) {
        return `現在ページは総ページ数（${totalPages}）以下で入力してください。`;
    }

    return "";
}

async function updateBookProgress(bookId, currentPage) {
    const progressApiUrl = getBookProgressApiUrl(bookId);
    const response = await fetch(progressApiUrl, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ currentPage })
    });

    if (!response.ok) {
        const error = new Error(`PUT ${progressApiUrl} failed: ${response.status}`);

        error.status = response.status;
        error.apiMessage = await readApiErrorMessage(response);
        throw error;
    }
}

function getProgressFailureMessage(error) {
    if (error.status === 400) {
        return error.apiMessage
            ? `現在ページを更新できませんでした。${error.apiMessage}`
            : "現在ページを更新できませんでした。入力値を確認してください。";
    }

    if (error.status === 404) {
        return "この本は見つかりませんでした。すでに削除された可能性があります。";
    }

    return "現在ページを更新できませんでした。時間をおいて再度お試しください。";
}

function getProgressRefreshFailureMessage(detailError, listError) {
    if (detailError !== null && listError !== null) {
        return "現在ページは更新されましたが、詳細と一覧の最新情報を再取得できませんでした。ページを再読み込みしてください。";
    }

    if (detailError !== null) {
        return detailError.status === 404
            ? "現在ページは更新されましたが、この本の最新情報を取得できませんでした。一覧を更新して再度お試しください。"
            : "現在ページは更新されましたが、詳細の最新情報を再取得できませんでした。本を選び直してください。";
    }

    return "現在ページは更新され、詳細を更新しましたが、一覧の最新情報を再取得できませんでした。ページを再読み込みしてください。";
}

async function requestBookProgressUpdate(event, book) {
    event.preventDefault();

    if (isDetailUpdateInProgress() || editingBookId !== null) {
        return;
    }

    const form = event.currentTarget;
    const currentPage = form.elements.currentPage.valueAsNumber;
    const inputError = getProgressInputError(currentPage, Number(book.totalPages));

    setProgressActionError(inputError);

    if (inputError !== "") {
        form.elements.currentPage.focus();
        return;
    }

    const bookId = String(book.id);
    let progressUpdated = false;
    let refreshCompleted = false;

    setProgressUpdatingState(true);

    try {
        await updateBookProgress(bookId, currentPage);
        progressUpdated = true;

        const { detailError, listError } = await refreshBookViews(bookId);

        if (detailError !== null || listError !== null) {
            console.error("現在ページ更新後に最新情報を再取得できませんでした。", {
                detailError,
                listError
            });
            setProgressActionError(getProgressRefreshFailureMessage(detailError, listError));
            return;
        }

        refreshCompleted = true;
    } catch (error) {
        if (progressUpdated) {
            console.error("現在ページ更新後に最新情報を反映できませんでした。", error);
            setProgressActionError(
                "現在ページは更新されましたが、最新情報を画面へ反映できませんでした。ページを再読み込みしてください。"
            );
        } else {
            console.error("現在ページを更新できませんでした。", error);
            setProgressActionError(getProgressFailureMessage(error));
        }
    } finally {
        setProgressUpdatingState(false);
    }

    if (refreshCompleted) {
        document.getElementById("book-progress-current-page")?.focus();
    }
}

function confirmBookCompletion(book) {
    const currentPage = Number(book.currentPage);
    const totalPages = Number(book.totalPages);

    if (currentPage >= totalPages) {
        return true;
    }

    return window.confirm(
        `現在の進捗は${book.currentPage} / ${book.totalPages}です。\n`
        + `読了にすると現在ページが${book.totalPages}へ変更されます。\n`
        + "読了にしますか？"
    );
}

async function updateBookCompletion(bookId, isCompleted) {
    const completionApiUrl = getBookCompletionApiUrl(bookId);
    const response = await fetch(completionApiUrl, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ isCompleted })
    });

    if (!response.ok) {
        const error = new Error(`PUT ${completionApiUrl} failed: ${response.status}`);

        error.status = response.status;
        error.apiMessage = await readApiErrorMessage(response);
        throw error;
    }
}

async function updateBookFavorite(bookId, isFavorite) {
    const favoriteApiUrl = getBookFavoriteApiUrl(bookId);
    const response = await fetch(favoriteApiUrl, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ isFavorite })
    });

    if (!response.ok) {
        const error = new Error(`PUT ${favoriteApiUrl} failed: ${response.status}`);

        error.status = response.status;
        error.apiMessage = await readApiErrorMessage(response);
        throw error;
    }
}

async function refreshFavoriteBookViews(bookId) {
    const normalizedBookId = String(bookId);
    const shouldRefreshDetail = selectedBookId === normalizedBookId
        && !isCreatingBook;
    const detailPromise = shouldRefreshDetail
        ? fetchBookDetail(normalizedBookId)
        : Promise.resolve(null);
    const [detailResult, listResult] = await Promise.allSettled([
        detailPromise,
        fetchBooks()
    ]);
    let bookIsVisible = true;

    if (listResult.status === "fulfilled") {
        bookIsVisible = containsBookId(listResult.value, normalizedBookId);
        updateBookList(listResult.value);

        if (shouldRefreshDetail && bookIsVisible) {
            setSelectedBook(normalizedBookId);
        } else if (shouldRefreshDetail) {
            closeBookDetailPanel();
        }
    }

    if (shouldRefreshDetail
        && detailResult.status === "fulfilled"
        && detailResult.value !== null
        && bookIsVisible
        && selectedBookId === normalizedBookId) {
        renderBookDetail(detailResult.value);
    }

    return {
        detailError: shouldRefreshDetail && detailResult.status === "rejected"
            ? detailResult.reason
            : null,
        listError: listResult.status === "rejected" ? listResult.reason : null
    };
}

function getFavoriteFailureMessage(error, targetState) {
    if (error.status === 404) {
        return "この本は見つかりませんでした。すでに削除された可能性があります。";
    }

    const operation = targetState ? "お気に入りに追加" : "お気に入りから削除";

    if (error.status === 400 && error.apiMessage) {
        return `${operation}できませんでした。${error.apiMessage}`;
    }

    return `${operation}できませんでした。表示は変更前の状態を維持しています。時間をおいて再度お試しください。`;
}

function getFavoriteRefreshFailureMessage(detailError, listError) {
    if (detailError !== null && listError !== null) {
        return "お気に入り状態は変更されましたが、詳細と一覧の最新情報を再取得できませんでした。ページを再読み込みしてください。";
    }

    if (detailError !== null) {
        return detailError.status === 404
            ? "お気に入り状態は変更されましたが、この本の最新情報を取得できませんでした。一覧を更新して再度お試しください。"
            : "お気に入り状態は変更されましたが、詳細の最新情報を再取得できませんでした。本を選び直してください。";
    }

    return "お気に入り状態は変更されましたが、一覧の最新情報を再取得できませんでした。ページを再読み込みしてください。";
}

async function requestBookFavoriteChange(book, source) {
    const bookId = String(book.id);

    if (favoriteUpdateBookId !== null || isDetailUpdateInProgress()) {
        return;
    }

    if (editingBookId === bookId) {
        clearFavoriteActionErrors();
        showFavoriteActionError(
            "この本を編集中です。保存またはキャンセルしてからお気に入りを変更してください。",
            source
        );
        return;
    }

    const targetState = !Boolean(book.isFavorite);
    let favoriteUpdated = false;
    let refreshCompleted = false;

    clearFavoriteActionErrors();
    setFavoriteUpdatingState(bookId, true);

    try {
        await updateBookFavorite(bookId, targetState);
        favoriteUpdated = true;

        const { detailError, listError } = await refreshFavoriteBookViews(bookId);

        if (detailError !== null || listError !== null) {
            console.error("お気に入り状態の変更後に最新情報を再取得できませんでした。", {
                detailError,
                listError
            });
            showFavoriteActionError(
                getFavoriteRefreshFailureMessage(detailError, listError),
                source
            );
            return;
        }

        refreshCompleted = true;
    } catch (error) {
        if (favoriteUpdated) {
            console.error("お気に入り状態の変更後に最新情報を反映できませんでした。", error);
            showFavoriteActionError(
                "お気に入り状態は変更されましたが、最新情報を画面へ反映できませんでした。ページを再読み込みしてください。",
                source
            );
        } else {
            console.error("お気に入り状態を変更できませんでした。", error);
            showFavoriteActionError(getFavoriteFailureMessage(error, targetState), source);
        }
    } finally {
        setFavoriteUpdatingState(bookId, false);
    }

    if (refreshCompleted) {
        const focusTarget = Array.from(document.querySelectorAll("[data-favorite-book-id]"))
            .find((button) => button.dataset.favoriteBookId === bookId
                && button.dataset.favoriteSource === source);

        focusTarget?.focus();
    }
}

async function refreshBookViews(bookId) {
    const [detailResult, listResult] = await Promise.allSettled([
        fetchBookDetail(bookId),
        fetchBooks()
    ]);
    let bookIsVisible = true;

    if (listResult.status === "fulfilled") {
        bookIsVisible = containsBookId(listResult.value, bookId);
        updateBookList(listResult.value);

        if (bookIsVisible) {
            setSelectedBook(bookId);
        } else {
            closeBookDetailPanel();
        }
    }

    if (detailResult.status === "fulfilled" && bookIsVisible) {
        renderBookDetail(detailResult.value);
    }

    return {
        detailError: detailResult.status === "rejected" ? detailResult.reason : null,
        listError: listResult.status === "rejected" ? listResult.reason : null
    };
}

function getCompletionFailureMessage(error, targetState) {
    if (error.status === 404) {
        return "この本は見つかりませんでした。すでに削除された可能性があります。";
    }

    const operation = targetState ? "読了に" : "読了解除";

    if (error.status === 400 && error.apiMessage) {
        return `${operation}できませんでした。${error.apiMessage}`;
    }

    return `${operation}できませんでした。時間をおいて再度お試しください。`;
}

function getCompletionRefreshFailureMessage(detailError, listError) {
    if (detailError !== null && listError !== null) {
        return "読了状態は変更されましたが、詳細と一覧の最新情報を再取得できませんでした。ページを再読み込みしてください。";
    }

    if (detailError !== null) {
        return detailError.status === 404
            ? "読了状態は変更されましたが、この本の最新情報を取得できませんでした。一覧を更新して再度お試しください。"
            : "読了状態は変更されましたが、詳細の最新情報を再取得できませんでした。本を選び直してください。";
    }

    return "読了状態は変更され、詳細を更新しましたが、一覧の最新情報を再取得できませんでした。ページを再読み込みしてください。";
}

async function requestBookCompletionChange(book) {
    if (isDetailUpdateInProgress() || editingBookId !== null) {
        return;
    }

    const targetState = !book.isCompleted;

    if (targetState && !confirmBookCompletion(book)) {
        return;
    }

    const bookId = String(book.id);
    let completionUpdated = false;
    let refreshCompleted = false;

    setCompletionActionError("");
    setCompletionUpdatingState(true, targetState);

    try {
        await updateBookCompletion(bookId, targetState);
        completionUpdated = true;

        const { detailError, listError } = await refreshBookViews(bookId);

        if (detailError !== null || listError !== null) {
            console.error("読了状態の変更後に最新情報を再取得できませんでした。", {
                detailError,
                listError
            });
            setCompletionActionError(getCompletionRefreshFailureMessage(detailError, listError));
            return;
        }

        refreshCompleted = true;
    } catch (error) {
        if (completionUpdated) {
            console.error("読了状態の変更後に最新情報を反映できませんでした。", error);
            setCompletionActionError(
                "読了状態は変更されましたが、最新情報を画面へ反映できませんでした。ページを再読み込みしてください。"
            );
        } else {
            console.error("読了状態を変更できませんでした。", error);
            setCompletionActionError(getCompletionFailureMessage(error, targetState));
        }
    } finally {
        setCompletionUpdatingState(false);
    }

    if (refreshCompleted) {
        document.getElementById("book-completion-action")?.focus();
    }
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
    const coverButton = document.getElementById("book-cover-select");
    const coverInput = document.getElementById("book-cover-file");

    isSavingBook = isSaving;
    bookDetailPanel.setAttribute("aria-busy", String(isSaving));
    bookDetailEditButton.textContent = isSaving ? "保存中…" : "保存";
    bookDetailEditButton.disabled = isSaving;
    bookDetailCancelButton.disabled = isSaving;
    bookDetailCloseButton.disabled = isSaving;

    if (coverButton !== null) {
        coverButton.disabled = isSaving;
    }

    if (coverInput !== null) {
        coverInput.disabled = isSaving;
    }

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

async function updateBookDetails(bookId, updatePayload) {
    const bookApiUrl = getBookApiUrl(bookId);
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

async function finishBookEditSave(bookId, resultMessage = "") {
    const { detailError, listError } = await refreshBookViews(bookId);

    clearEditingState();
    setDetailViewControlsDisabled(false);

    if (detailError !== null) {
        currentBookDetail = null;
        setDetailActionsUnavailable();
        showBookDetailMessage(
            resultMessage !== ""
                ? `${resultMessage} また、最新の詳細情報を取得できませんでした。ページを再読み込みしてください。`
                : "保存は完了しましたが、最新の詳細情報を取得できませんでした。ページを再読み込みしてください。",
            "error"
        );
        return false;
    }

    setDetailActionsForView();

    if (resultMessage !== "" || listError !== null) {
        const listMessage = listError !== null
            ? "一覧の最新情報を取得できなかったため、ページを再読み込みしてください。"
            : "";

        setCompletionActionError([resultMessage, listMessage].filter(Boolean).join(" "));
        return false;
    }

    bookDetailEditButton.focus();
    return true;
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
    const updatePayload = createUpdateBookPayload(form);
    const hasGeneralChanges = hasGeneralBookEdits(form, editBookSnapshot);
    const selectedCoverFile = pendingEditCoverFile;
    const hasPendingCoverChange = selectedCoverFile !== null;
    const targetCompletionState = getSelectedCompletionState(form);
    const hasCompletionSelectionChange = targetCompletionState !== Boolean(editBookSnapshot.isCompleted);
    let generalUpdateCompleted = false;
    let coverUploadStarted = false;
    let coverUploadCompleted = false;
    let completionRequestStarted = false;
    let completionUpdateCompleted = false;
    let updatesCompleted = false;

    if (!hasGeneralChanges && !hasCompletionSelectionChange && !hasPendingCoverChange) {
        const bookBeforeEditing = editBookSnapshot;

        clearEditingState();
        renderBookDetail(bookBeforeEditing);
        bookDetailEditButton.focus();
        return;
    }

    setBookEditError("");
    setBookSavingState(true);

    try {
        let completionStateAfterGeneralUpdate = Boolean(editBookSnapshot.isCompleted);

        if (hasGeneralChanges || hasPendingCoverChange) {
            await updateBookDetails(savedBookId, updatePayload);
            generalUpdateCompleted = true;

            if (selectedCoverFile !== null) {
                coverUploadStarted = true;
                await uploadBookCover(savedBookId, selectedCoverFile);
                coverUploadCompleted = true;
            }

            const bookAfterGeneralUpdate = await fetchBookDetail(savedBookId);

            completionStateAfterGeneralUpdate = Boolean(bookAfterGeneralUpdate.isCompleted);
        }

        if (hasCompletionSelectionChange
            || completionStateAfterGeneralUpdate !== targetCompletionState) {
            completionRequestStarted = true;
            await updateBookCompletion(savedBookId, targetCompletionState);
            completionUpdateCompleted = true;
        }

        updatesCompleted = true;
        await finishBookEditSave(savedBookId);
    } catch (error) {
        console.error("本を保存できませんでした。", error);

        if (updatesCompleted || completionUpdateCompleted) {
            await finishBookEditSave(
                savedBookId,
                "保存は完了しましたが、最新情報を画面へ反映できませんでした。"
            );
            return;
        }

        if (generalUpdateCompleted && coverUploadStarted && !coverUploadCompleted) {
            await finishBookEditSave(
                savedBookId,
                `一般情報は保存されましたが、${getCoverUploadFailureMessage(error)}`
            );
            return;
        }

        if (generalUpdateCompleted && coverUploadCompleted) {
            const partialSaveMessage = completionRequestStarted
                ? `一般情報と表紙は保存されましたが、${getCompletionFailureMessage(error, targetCompletionState)}`
                : "一般情報と表紙は保存されましたが、最新情報を確認できませんでした。";

            await finishBookEditSave(savedBookId, partialSaveMessage);
            return;
        }

        if (generalUpdateCompleted) {
            const partialSaveMessage = completionRequestStarted
                ? `一般情報は保存されましたが、${getCompletionFailureMessage(error, targetCompletionState)}`
                : "一般情報は保存されましたが、保存後の読了状態を確認できなかったため、読了状態の変更は行っていません。";

            await finishBookEditSave(savedBookId, partialSaveMessage);
            return;
        }

        setBookSavingState(false);
        setBookEditError(
            completionRequestStarted
                ? getCompletionFailureMessage(error, targetCompletionState)
                : getSaveFailureMessage(error)
        );
    }
}

function createBookCard(book) {
    const bookItem = bookCardTemplate.content.firstElementChild.cloneNode(true);
    const card = bookItem.querySelector(".book-card");
    const favoritePlaceholder = bookItem.querySelector(".book-card__favorite");
    const coverImage = bookItem.querySelector(".book-card__cover-image");
    const title = bookItem.querySelector(".book-card__title");
    const currentPage = bookItem.querySelector(".book-card__current-page");
    const totalPages = bookItem.querySelector(".book-card__total-pages");
    const progress = bookItem.querySelector(".book-card__progress");
    const progressValue = bookItem.querySelector(".book-card__progress-value");
    const progressPercentage = calculateProgressPercentage(book.currentPage, book.totalPages);

    favoritePlaceholder.replaceWith(createFavoriteButton(book, "card"));

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

function hasActiveBookListQuery(queryState = bookListQueryState) {
    return queryState.searchTitle !== ""
        || queryState.interestLevel !== ""
        || queryState.genre !== ""
        || queryState.readingStatus !== ""
        || queryState.isFavorite === true;
}

function renderBooks(books) {
    const selectedBookIdBeforeRender = selectedBookId;

    if (books.length === 0) {
        showListMessage(
            hasActiveBookListQuery()
                ? "該当する本がありません。"
                : "本がまだ登録されていません。",
            "empty"
        );
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

function updateBookList(books) {
    renderBooks(books);
    updateResultCount(books);
}

function updateResultCount(books) {
    if (books === null) {
        bookResultCount.textContent = "表示件数: 取得失敗";
        return;
    }

    const count = books.length;
    const completedCount = books.filter((book) => book.isCompleted === true).length;

    bookResultCount.textContent = `表示件数: ${count}冊　読了: ${completedCount}冊`;
}

populateDetailedFilterOptions(interestLevelFilter, INTEREST_LEVEL_LABELS);
populateDetailedFilterOptions(genreFilter, GENRE_LABELS);
populateDetailedFilterOptions(readingStatusFilter, READING_STATUS_LABELS);
updateDetailedFilterResetButtonState();
syncFavoriteFilterControl(bookListQueryState);

titleSearchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    searchBooksByTitle();
});

for (const filter of [interestLevelFilter, genreFilter, readingStatusFilter]) {
    filter.addEventListener("change", () => {
        searchBooksByDetailedFilters(filter);
    });
}

detailedFilterResetButton.addEventListener("click", () => {
    resetDetailedFilters();
});

for (const quickFilterButton of quickFilterButtons) {
    quickFilterButton.addEventListener("click", () => {
        searchBooksByQuickFilter(quickFilterButton.dataset.quickFilter);
    });
}

favoriteFilterButton.addEventListener("click", () => {
    searchBooksByFavoriteFilter();
});

helpButton.addEventListener("click", () => {
    openHelpPanel();
});

helpPanelCloseButton.addEventListener("click", () => {
    closeHelpPanel();
});

addBookButton.addEventListener("click", () => {
    requestStartBookCreation();
});

bookDetailCloseButton.addEventListener("click", () => {
    requestCloseBookDetailPanel(true);
});

bookDetailEditButton.addEventListener("click", () => {
    if (isCreatingBook) {
        document.getElementById("book-create-form")?.requestSubmit();
        return;
    }

    if (editingBookId === null) {
        startBookEditing();
        return;
    }

    document.getElementById("book-edit-form")?.requestSubmit();
});

bookDetailCancelButton.addEventListener("click", () => {
    if (isCreatingBook) {
        cancelBookCreation();
        return;
    }

    cancelBookEditing();
});

bookDeleteCancelButton.addEventListener("click", () => {
    closeBookDeleteDialog();
});

bookDeleteConfirmButton.addEventListener("click", () => {
    confirmBookDeletion();
});

bookDeleteDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeBookDeleteDialog();
});

bookDeleteDialog.addEventListener("click", (event) => {
    const dialogBounds = bookDeleteDialog.getBoundingClientRect();
    const clickedOutsideDialog = event.clientX < dialogBounds.left
        || event.clientX > dialogBounds.right
        || event.clientY < dialogBounds.top
        || event.clientY > dialogBounds.bottom;

    if (clickedOutsideDialog) {
        closeBookDeleteDialog();
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && bookDeleteDialog.open) {
        return;
    }

    if (event.key === "Escape" && !helpPanel.hidden) {
        event.preventDefault();
        closeHelpPanel();
        return;
    }

    if (event.key === "Escape" && !bookDetailPanel.hidden) {
        requestCloseBookDetailPanel(true);
    }
});

loadBooks();
