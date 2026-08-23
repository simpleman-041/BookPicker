async function loadBooks() {
    const response = await fetch('/api/books');
    const books = await response.json();

    for (const book of books) {
        console.log(book.title);
    }
}

loadBooks();