const API_URL = "https://rithm-jeopardy.herokuapp.com/api/";
const NUMBER_OF_CATEGORIES = 6;
const NUMBER_OF_CLUES_PER_CATEGORY = 3;

let categories = [];
let activeClue = null;
let activeClueMode = 0;
let isPlayButtonClickable = true;

// Event listener for the play button
$("#play").on("click", handleClickOfPlay);

function handleClickOfPlay() {
  if (isPlayButtonClickable) {
    isPlayButtonClickable = false;
    setupTheGame(); // Initialize game setup
  }
}

async function setupTheGame() {
  // Show the spinner while setting up the game
  $("#spinner").addClass("show");

  // Fetch the game data (categories with clues)
  const categoryIds = await getCategoryIds();
  console.log(categoryIds);
  categories = await Promise.all(categoryIds.map(id => getCategoryData(id)));

  // Hide the spinner
  $("#spinner").removeClass("show");

  $("#categories").empty(); // Clear the categories
  $("#clues").empty(); // Clear the clues
  $("#play").text("Playing...");
  $("#active-clue").html("");

  // Fill the table with the fetched data
  fillTable(categories);
  
}

async function getCategoryIds() {
  let ids = [];

  const res = await axios.get(`${API_URL}/categories?count=50`);
  const responseCategories = res.data;
  console.log(responseCategories);
  // Filter categories to ensure they have enough clues
  const filteredCategories = responseCategories.filter(category => category.clues_count >= NUMBER_OF_CLUES_PER_CATEGORY);
  
  // Randomly pick NUMBER_OF_CATEGORIES categories
  while (ids.length < NUMBER_OF_CATEGORIES) {
    const randomIndex = Math.floor(Math.random() * filteredCategories.length);
    const category = filteredCategories.splice(randomIndex, 1)[0];
    ids.push(category.id);
  }

  return ids;
}

async function getCategoryData(categoryId) {
  const categoryWithClues = {
    id: categoryId,
    title: undefined, // Placeholder for the category title
    clues: [] // Placeholder for the clues
  };

  // Fetch the category data
  const res = await axios.get(`${API_URL}/category?id=${categoryId}`);
  const category = res.data;

  categoryWithClues.title = category.title; // Set the title
  categoryWithClues.clues = category.clues.slice(0, NUMBER_OF_CLUES_PER_CATEGORY).map(clue => ({
    id: clue.id,
    value: clue.value || 200, // Assign default value if not provided
    question: clue.question,
    answer: clue.answer
  }));

  return categoryWithClues;
}

function fillTable(categories) {
  const thead = $("#categories");
  const tbody = $("#clues");

  thead.empty();
  tbody.empty();

  // Populate table headers with category titles
  categories.forEach(category => {
    const th = $("<th></th>").text(category.title);
    thead.append(th);
  });

  // Populate table body with clues
  for (let i = 0; i < NUMBER_OF_CLUES_PER_CATEGORY; i++) {
    const bodyRow = $("<tr></tr>");
    categories.forEach(category => {
      const clue = category.clues[i];
      const td = $("<td></td>")
        .text(clue.value)
        .attr("id", `category-${category.id}-clue-${clue.id}`)
        .addClass("clue")
        .on("click", handleClickOfClue); // Attach click event handler for clues
      bodyRow.append(td);
    });
    tbody.append(bodyRow);
  }
}

function handleClickOfClue(event) {
  if (activeClueMode !== 0) return; // Exit if another clue is active

  const clueId = event.currentTarget.id;
  const [categoryPrefix, categoryId, cluePrefix, clueIdValue] = clueId.split("-");
  const category = categories.find(cat => cat.id === parseInt(categoryId));
  const clueIndex = category.clues.findIndex(clue => clue.id === parseInt(clueIdValue));
  const clue = category.clues[clueIndex];

  category.clues.splice(clueIndex, 1); // Remove the clicked clue from the category
  if (category.clues.length === 0) {
    categories = categories.filter(cat => cat.id !== parseInt(categoryId)); // Remove the category if no clues are left
  }

  $(event.currentTarget).addClass("viewed"); // Mark clue as viewed
  $("#active-clue").text(clue.question); // Display the question

  activeClue = clue;
  activeClueMode = 1; // Set the active clue mode
}

$("#active-clue").on("click", handleClickOfActiveClue);

function handleClickOfActiveClue(event) {
  if (activeClueMode === 1) {
    activeClueMode = 2;
    $("#active-clue").html(activeClue.answer); // Display the answer
  } else if (activeClueMode === 2) {
    activeClueMode = 0;
    $("#active-clue").html(null); // Clear the active clue

    if (categories.length === 0) {
      $("#active-clue").html("The End!"); // Indicate end of the game
      $("#play").text("New Game?");
      isPlayButtonClickable = true;
    }
  }
}
