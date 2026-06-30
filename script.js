const screens = document.querySelectorAll(".screen");
const navButtons = document.querySelectorAll("[data-next], [data-back]");
const priorityCheckboxes = document.querySelectorAll(
  'input[name="priorities"]',
);

const showScreen = (screenId) => {
  screens.forEach((screen) => {
    screen.hidden = true;
  });

  const selectedScreen = document.querySelector(`#${screenId}`);

  if (selectedScreen) {
    selectedScreen.hidden = false;
  }
};

const getRadioValue = (name) => {
  const selectedOption = document.querySelector(
    `input[name="${name}"]:checked`,
  );

  if (selectedOption) {
    return selectedOption.value;
  }

  return "Not selected";
};

const getCheckedValues = (name) => {
  const checkedOptions = document.querySelectorAll(
    `input[name="${name}"]:checked`,
  );
  const values = [];

  checkedOptions.forEach((option) => {
    values.push(option.value);
  });

  return values;
};

const formatBudget = (value) => {
  if (!value) {
    return "Not entered";
  }

  return `$${Number(value).toLocaleString()}`;
};

const updateReviewScreen = () => {
  const maxBudget = document.querySelector("#maxBudget").value;
  const useCase = getRadioValue("useCase");
  const performanceGoal = getRadioValue("performanceGoal");
  const priorities = getCheckedValues("priorities");

  document.querySelector("#reviewBudget").textContent = formatBudget(maxBudget);
  document.querySelector("#reviewUseCase").textContent = useCase;
  document.querySelector("#reviewPerformance").textContent = performanceGoal;

  document.querySelector("#reviewPriorities").textContent =
    priorities.length > 0 ? priorities.join(", ") : "None selected";
};

priorityCheckboxes.forEach((checkbox) => {
  checkbox.addEventListener("change", () => {
    const selectedPriorities = getCheckedValues("priorities");

    if (selectedPriorities.length > 2) {
      checkbox.checked = false;
      alert("Please choose up to two extra priorities.");
    }
  });
});

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const nextScreenId = button.dataset.next;
    const backScreenId = button.dataset.back;

    if (nextScreenId === "reviewScreen") {
      updateReviewScreen();
    }

    if (nextScreenId) {
      showScreen(nextScreenId);
    }

    if (backScreenId) {
      showScreen(backScreenId);
    }
  });
});
