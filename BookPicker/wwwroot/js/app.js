async function loadBooks() {
    const response = await fetch('/api/books');
    const books = await response.json();

    const bookList = document.getElementById("book-list");

    for (const book of books) {
        const bookItem = document.createElement("li");

        bookItem.textContent = book.title;

        bookList.appendChild(bookItem);
    }
}

loadBooks();