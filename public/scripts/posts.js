document.addEventListener("DOMContentLoaded", () => {
    const categoriesContainer = document.querySelector(".categories-container");

    fetch("/api/posts-structured")
        .then((response) => response.json())
        .then((categories) => {
            categories.forEach((category) => {
                const categoryDiv = document.createElement("div");
                categoryDiv.classList.add("category");

                // Tytuł kategorii
                const categoryTitle = document.createElement("h2");
                categoryTitle.classList.add("category-title");
                categoryTitle.textContent = category.name;
                categoryDiv.appendChild(categoryTitle);

                // Podkategorie
                category.subcategories.forEach((subcategory) => {
                    const subcategoryDiv = document.createElement("div");
                    subcategoryDiv.classList.add("subcategory");

                    const subcategoryTitle = document.createElement("h3");
                    subcategoryTitle.classList.add("subcategory-title");
                    subcategoryTitle.textContent = subcategory.name;
                    subcategoryDiv.appendChild(subcategoryTitle);

                    // Wątki
                    const threadsContainer = document.createElement("div");
                    threadsContainer.classList.add("threads-container");

                    subcategory.threads.forEach((thread) => {
                        const threadDiv = document.createElement("div");
                        threadDiv.classList.add("thread");

                        const threadInfo = document.createElement("div");
                        threadInfo.classList.add("thread-info");

                        const threadTitle = document.createElement("h4");
                        threadTitle.classList.add("thread-title");
                        threadTitle.textContent = thread.title;
                        threadInfo.appendChild(threadTitle);

                        const threadMeta = document.createElement("p");
                        threadMeta.classList.add("thread-meta");
                        threadMeta.textContent = `Autor: ${thread.author} | Odpowiedzi: ${thread.replies} | Lajki: ${thread.likes}`;
                        threadInfo.appendChild(threadMeta);

                        threadDiv.appendChild(threadInfo);
                        threadsContainer.appendChild(threadDiv);
                    });

                    subcategoryDiv.appendChild(threadsContainer);
                    categoryDiv.appendChild(subcategoryDiv);
                });

                categoriesContainer.appendChild(categoryDiv);
            });
        })
        .catch((error) => {
            console.error("Błąd podczas pobierania kategorii:", error);
        });
});
