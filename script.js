const screens = document.querySelectorAll(".screen");
const navButtons = document.querySelectorAll("[data-next], [data-back]");
const priorityCheckboxes = document.querySelectorAll(
  'input[name="priorities"]',
);

const budgetLabels = {
  900: "Under $900",
  1500: "$900 - $1,500",
  2000: "$1,500 - $2,000",
  3000: "$2,000 - $3,000",
  5000: "$3,000 - $5,000",
  99999: "$5,000+",
};

let parts = [];
let recommendedParts = [];

// Loads the parts database from the JSON file.
const loadPartsDatabase = async () => {
  try {
    const response = await fetch("data/parts.json");

    if (!response.ok) {
      throw new Error("Parts database could not load.");
    }
    const partsData = await response.json();
    parts = partsData.parts;
  } catch (error) {
    console.error("Database loading error:", error);
  }
};

loadPartsDatabase();

// Shows one screen and hides the others.
const showScreen = (screenId) => {
  screens.forEach((screen) => {
    screen.hidden = true;
  });
  const selectedScreen = document.querySelector(`#${screenId}`);

  if (selectedScreen) {
    selectedScreen.hidden = false;
  }
};

// Gets the selected radio button value for a question.
const getRadioValue = (name) => {
  const selectedOption = document.querySelector(
    `input[name="${name}"]:checked`,
  );

  if (selectedOption) {
    return selectedOption.value;
  }

  return "Not selected";
};

// Gets all selected checkbox values for a question.
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

// Updates the review screen with the user's current choices.
const updateReviewScreen = () => {
  const selectedBudget = document.querySelector(
    'input[name="budgetChoice"]:checked',
  );

  const useCase = getRadioValue("useCase");
  const performanceGoal = getRadioValue("performanceGoal");
  const priorities = getCheckedValues("priorities");

  document.querySelector("#reviewBudget").textContent = selectedBudget
    ? budgetLabels[selectedBudget.value]
    : "Not selected";

  document.querySelector("#reviewUseCase").textContent = useCase;
  document.querySelector("#reviewPerformance").textContent = performanceGoal;

  document.querySelector("#reviewPriorities").textContent =
    priorities.length > 0 ? priorities.join(", ") : "None selected";
};

// Collects all user choices into one object for the recommendation logic.
const getUserSelections = () => {
  const selectedBudget = document.querySelector(
    'input[name="budgetChoice"]:checked',
  );

  const budgetMin = selectedBudget ? Number(selectedBudget.dataset.min) : 0;
  const budgetMax = selectedBudget ? Number(selectedBudget.dataset.max) : 0;

  return {
    budgetLabel: selectedBudget
      ? budgetLabels[selectedBudget.value]
      : "Not selected",
    budgetMin,
    budgetMax,
    useCase: getRadioValue("useCase"),
    performanceGoal: getRadioValue("performanceGoal"),
    priorities: getCheckedValues("priorities"),
  };
};

const selectionTagMap = {
  Gaming: ["gaming"],
  Streaming: ["content", "gaming"],
  "School / Coding": ["student", "work"],
  "Content Creation": ["content", "work"],
  "Work / Productivity": ["work"],
  "Everyday Use": ["student", "work", "value"],

  "Budget / Value": ["value"],
  "Max FPS": ["max-fps"],
  "1440p Gaming": ["1440p"],
  "4K Gaming": ["4k"],
  "Quiet Build": ["quiet"],
  "RGB / Looks": ["rgb"],
  "Future Upgrades": ["future-upgrades"],
  Multitasking: ["work", "content"],

  "Quiet Operation": ["quiet"],
  "More Storage": ["storage"],
  "Better Multitasking": ["work", "content"],
  "Lower Price": ["value"],
  "Streaming Ready": ["content"],
  "Clean / Simple Build": ["value", "quiet"],
};

// Converts user choices into tags that can be matched against parts.
const getWeightedTags = (userSelections) => {
  const weightedTags = [];

  const useCaseTags = selectionTagMap[userSelections.useCase] || [];
  const performanceTags = selectionTagMap[userSelections.performanceGoal] || [];

  useCaseTags.forEach((tag) => {
    weightedTags.push({
      tag: tag,
      weight: 2,
    });
  });

  performanceTags.forEach((tag) => {
    weightedTags.push({
      tag: tag,
      weight: 4,
    });
  });

  userSelections.priorities.forEach((priority) => {
    const priorityTags = selectionTagMap[priority] || [];

    priorityTags.forEach((tag) => {
      weightedTags.push({
        tag: tag,
        weight: 1,
      });
    });
  });

  return weightedTags;
};

// Gives a part a score based on how well its tags match the user's choices.
const scorePart = (part, weightedTags) => {
  let score = 0;

  weightedTags.forEach((tagItem) => {
    if (part.tags.includes(tagItem.tag)) {
      score += tagItem.weight;
    }
  });

  return score;
};

const getPartsByCategory = (category) => {
  return parts.filter((part) => part.category === category);
};

const categoryBudgetPercentages = {
  CPU: 0.16,
  GPU: 0.4,
  Motherboard: 0.12,
  RAM: 0.12,
  Storage: 0.1,
  PSU: 0.08,
  Case: 0.08,
  Cooling: 0.06,
};

// Sets a rough price limit for each part category based on total budget.
const getCategoryBudgetLimit = (category, budgetMax) => {
  if (budgetMax >= 99999) {
    return Infinity;
  }

  return budgetMax * categoryBudgetPercentages[category];
};

// Picks the best part in a category while trying to stay near budget.
const getBestPart = (category, weightedTags, budgetMax) => {
  const categoryLimit = getCategoryBudgetLimit(category, budgetMax);

  const categoryParts = getPartsByCategory(category);

  const budgetSafeParts = categoryParts.filter((part) => {
    return part.estimatedPrice <= categoryLimit;
  });

  const listToUse =
    budgetSafeParts.length > 0 ? budgetSafeParts : categoryParts;

  return listToUse
    .map((part) => {
      return {
        ...part,
        score: scorePart(part, weightedTags),
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.estimatedPrice - b.estimatedPrice;
    })[0];
};

// Finds motherboards that match the selected CPU socket.
const getCompatibleMotherboards = (cpu) => {
  if (cpu.compatibilityGroup === "AM4") {
    return parts.filter((part) => {
      return (
        part.category === "Motherboard" &&
        part.compatibilityGroup.includes("AM4")
      );
    });
  }

  if (cpu.compatibilityGroup === "AM5") {
    return parts.filter((part) => {
      return (
        part.category === "Motherboard" &&
        part.compatibilityGroup.includes("AM5")
      );
    });
  }

  if (cpu.compatibilityGroup === "LGA1700") {
    return parts.filter((part) => {
      return (
        part.category === "Motherboard" &&
        part.compatibilityGroup.includes("LGA1700")
      );
    });
  }

  return [];
};

// Finds RAM that matches the selected motherboard type.
const getCompatibleRam = (motherboard) => {
  if (motherboard.compatibilityGroup.includes("DDR4")) {
    return parts.filter(
      (part) => part.category === "RAM" && part.compatibilityGroup === "DDR4",
    );
  }

  if (motherboard.compatibilityGroup.includes("DDR5")) {
    return parts.filter(
      (part) => part.category === "RAM" && part.compatibilityGroup === "DDR5",
    );
  }

  return [];
};

// Finds the best combination of CPU, motherboard, and RAM that fits the budget and scores highest.
const getBestPlatformCombo = (weightedTags, budgetMax) => {
  const platformBudget = budgetMax >= 99999 ? Infinity : budgetMax * 0.45;
  const cpuParts = getPartsByCategory("CPU");
  const platformCombos = [];

  cpuParts.forEach((cpu) => {
    const compatibleMotherboards = getCompatibleMotherboards(cpu);

    compatibleMotherboards.forEach((motherboard) => {
      const compatibleRam = getCompatibleRam(motherboard);

      compatibleRam.forEach((ram) => {
        const cpuScore = scorePart(cpu, weightedTags);
        const motherboardScore = scorePart(motherboard, weightedTags);
        const ramScore = scorePart(ram, weightedTags);

        const comboTotal =
          cpu.estimatedPrice + motherboard.estimatedPrice + ram.estimatedPrice;

        const comboScore = cpuScore * 2 + motherboardScore + ramScore;

        platformCombos.push({
          cpu: {
            ...cpu,
            score: cpuScore,
          },
          motherboard: {
            ...motherboard,
            score: motherboardScore,
          },
          ram: {
            ...ram,
            score: ramScore,
          },
          total: comboTotal,
          score: comboScore,
        });
      });
    });
  });

  const budgetSafeCombos = platformCombos.filter((combo) => {
    return combo.total <= platformBudget;
  });

  const listToUse =
    budgetSafeCombos.length > 0 ? budgetSafeCombos : platformCombos;

  return listToUse.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return a.total - b.total;
  })[0];
};

// Finds cases that support the selected motherboard form factor.
const getCompatibleCases = (motherboard) => {
  return parts.filter((part) => {
    return (
      part.category === "Case" &&
      part.supportedFormFactors.includes(motherboard.formFactor)
    );
  });
};

// Finds coolers that are compatible with the selected CPU and fit in the selected case.
const getCompatibleCoolers = (cpu, pcCase) => {
  return parts.filter((part) => {
    return (
      part.category === "Cooling" &&
      part.compatibilityGroup.includes(cpu.compatibilityGroup) &&
      part.radiatorSize <= pcCase.maxRadiatorSize
    );
  });
};

// Picks the best part from a list while trying to stay near budget.
const getBestFromList = (partList, weightedTags, category, budgetMax) => {
  const categoryLimit = getCategoryBudgetLimit(category, budgetMax);

  const budgetSafeParts = partList.filter((part) => {
    return part.estimatedPrice <= categoryLimit;
  });

  const listToUse = budgetSafeParts.length > 0 ? budgetSafeParts : partList;

  return listToUse
    .map((part) => {
      return {
        ...part,
        score: scorePart(part, weightedTags),
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.estimatedPrice - b.estimatedPrice;
    })[0];
};

// Picks the best part in a category with a preferred tier, while trying to stay near budget.
const getBestTierPart = (category, weightedTags, budgetMax, preferredTier) => {
  const categoryParts = getPartsByCategory(category);

  const preferredParts = categoryParts.filter((part) => {
    return part.tier === preferredTier;
  });

  const listToUse = preferredParts.length > 0 ? preferredParts : categoryParts;

  return getBestFromList(listToUse, weightedTags, category, budgetMax);
};

// Builds the final recommended part list from the user's choices.
const generateRecommendedBuild = (userSelections, weightedTags) => {
  const platformCombo = getBestPlatformCombo(
    weightedTags,
    userSelections.budgetMax,
  );

  const cpu = platformCombo.cpu;
  const motherboard = platformCombo.motherboard;
  const ram = platformCombo.ram;

  const gpu = getBestPart("GPU", weightedTags, userSelections.budgetMax);
  let storage;
  let psu;

  if (userSelections.budgetMax <= 900) {
    storage = getBestTierPart(
      "Storage",
      weightedTags,
      userSelections.budgetMax,
      "entry",
    );

    psu = getBestTierPart(
      "PSU",
      weightedTags,
      userSelections.budgetMax,
      "entry",
    );
  } else {
    storage = getBestPart("Storage", weightedTags, userSelections.budgetMax);
    psu = getBestPart("PSU", weightedTags, userSelections.budgetMax);
  }

  const compatibleCases = getCompatibleCases(motherboard);

  const pcCase = getBestFromList(
    compatibleCases,
    weightedTags,
    "Case",
    userSelections.budgetMax,
  );

  const compatibleCoolers = getCompatibleCoolers(cpu, pcCase);

  const cooling = getBestFromList(
    compatibleCoolers,
    weightedTags,
    "Cooling",
    userSelections.budgetMax,
  );

  return [cpu, gpu, motherboard, ram, storage, psu, pcCase, cooling];
};

const getBuildTotal = (buildParts) => {
  return buildParts.reduce((total, part) => {
    if (!part) {
      return total;
    }
    return total + part.estimatedPrice;
  }, 0);
};

// Formats numbers as US dollar prices.
const formatCurrency = (amount) => {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
};

// Generates a build name based on the user's performance goal.
const getBuildName = (userSelections) => {
  if (userSelections.performanceGoal === "4K Gaming") {
    return "4K Gaming PC";
  }

  if (userSelections.performanceGoal === "1440p Gaming") {
    return "1440p Gaming PC";
  }

  if (userSelections.performanceGoal === "Max FPS") {
    return "High FPS Gaming PC";
  }

  if (userSelections.performanceGoal === "Content Creation") {
    return "Creator Workstation PC";
  }

  if (userSelections.performanceGoal === "Budget / Value") {
    return "Value PC Build";
  }

  if (userSelections.performanceGoal === "Quiet Build") {
    return "Quiet Performance PC";
  }

  if (userSelections.performanceGoal === "RGB / Looks") {
    return "RGB Style PC";
  }

  return `${userSelections.useCase} PC Build`;
};

// Explains whether the build fits, exceeds, or comes under the selected budget.
const getBudgetMessage = (userSelections, buildTotal) => {
  if (buildTotal > userSelections.budgetMax) {
    const overBudget = buildTotal - userSelections.budgetMax;

    return `This build is ${formatCurrency(
      overBudget,
    )} over your selected budget range because some of your performance or style choices require stronger parts.`;
  }

  if (buildTotal < userSelections.budgetMin) {
    return `This build comes in under your selected range at ${formatCurrency(
      buildTotal,
    )}, while still matching your main choices.`;
  }

  return `This build fits your selected budget range at ${formatCurrency(
    buildTotal,
  )}.`;
};

// Updates the results screen with the generated recommendation.
const updateResultsScreen = () => {
  // Check if the parts database has loaded before proceeding.
  if (parts.length === 0) {
    document.querySelector("#buildDescription").textContent =
      "Parts database is still loading. Please try again.";
    return false;
  }

  const userSelections = getUserSelections();
  const weightedTags = getWeightedTags(userSelections);
  const recommendedBuild = generateRecommendedBuild(
    userSelections,
    weightedTags,
  );
  const buildTotal = getBuildTotal(recommendedBuild);
  recommendedParts = recommendedBuild;

  document.querySelector("#buildName").textContent =
    getBuildName(userSelections);

  document.querySelector("#buildDescription").textContent = getBudgetMessage(
    userSelections,
    buildTotal,
  );

  document.querySelector("#buildPrice").textContent =
    formatCurrency(buildTotal);

  document.querySelector("#buildGoal").textContent =
    userSelections.performanceGoal;

  document.querySelector("#buildBestFor").textContent = userSelections.useCase;

  return true;
};

// Renders the recommended parts list on the details screen.
const renderBuildDetails = () => {
  const partsList = document.querySelector("#partsList");

  if (!partsList) {
    return;
  }

  partsList.innerHTML = "";

  recommendedParts.forEach((part) => {
    const partCard = document.createElement("article");
    partCard.classList.add("part-card");

    partCard.innerHTML = `
      <h3>${part.category}</h3>
      <p class="part-name">${part.name}</p>
      <p class="part-price">${formatCurrency(part.estimatedPrice)}</p>
      <p>${part.reason}</p>
      <p>
        <strong>Compatibility Note:</strong> ${part.compatibility}
      </p>
      <p>
        <a href="${part.sourceUrl}" target="_blank" rel="noopener noreferrer">
          View product source
        </a>
      </p>
    `;

    partsList.appendChild(partCard);
  });
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

    if (nextScreenId === "resultsScreen") {
      updateResultsScreen();
    }

    if (nextScreenId === "detailsScreen") {
      renderBuildDetails();
    }

    if (nextScreenId) {
      showScreen(nextScreenId);
    }

    if (backScreenId) {
      showScreen(backScreenId);
    }
  });
});
