const chalk = require("chalk");
const fs = require("fs");
const prompts = require("prompts");
const path = require("path");
const sharp = require("sharp");

const getDataFromPrompt = async (name, desc, initial) => {
  const option = {
    type: "text",
    name,
    message: desc,
  };
  if (initial) {
    option.initial = initial;
  }
  const response = await prompts(option);
  return response[name];
};

const loadPreviousData = async () => {
  if (fs.existsSync("./.to-webp")) {
    const json = fs.readFileSync("./.to-webp");
    return JSON.parse(json);
  } else {
    return {};
  }
};

const savePreviousData = async (data) => {
  fs.writeFileSync("./.to-webp", JSON.stringify(data));
};

const listFiles = (directory) => {
  return fs.readdirSync(directory);
};

const changeImageToWebp = async (
  imagesDirectory,
  year,
  month,
  filename,
  extension
) => {
  return new Promise((resolve, reject) => {
    const sourceFilename = path.join(
      imagesDirectory,
      year,
      month,
      `${filename}.${extension}`
    );
    const targetFilename = path.join(
      imagesDirectory,
      year,
      month,
      `${filename}.webp`
    );
    console.log(
      `${chalk.blue("info")} From:${filename}.${extension} To:${filename}.webp`
    );
    if (fs.existsSync(targetFilename) && !fs.existsSync(sourceFilename)) {
      console.log(`${chalk.yellow("warn")} Ignore:${filename}.${extension}`);
      resolve();
    } else {
      sharp(sourceFilename)
        .webp({
          quality: 75,
        })
        .toFile(targetFilename, (err, info) => {
          if (err) {
            console.error(sourceFilename);
            reject(err);
          } else {
            fs.unlinkSync(sourceFilename);
            resolve();
          }
        });
    }
  });
};

const processFile = async (postsDirectory, filename, imagesDirectory) => {
  console.log(`${chalk.blue("info")} Start: ${filename}`);
  const file = fs.readFileSync(path.join(postsDirectory, filename), "utf-8");
  const regexpImageTag = RegExp(
    '\\!\\[\\]\\(\\{\\{ ?"([0-9a-zA-Z\\-_/.]+)" ?\\| ?prepend: ?site\\.baseurl ?\\}\\}\\)',
    "g"
  );
  const regexpImageName = RegExp(
    "/images/([0-9]+)/([0-9]+)/(.+)\\.([0-9a-zA-Z]+)",
    "g"
  );
  const matchedList = [...file.matchAll(regexpImageTag)];
  const body = [];
  let end = 0;
  for (const matched of matchedList) {
    const start = matched.index;
    body.push(file.substring(end, start));
    end = matched.index + matched[0].length;
    const m = [...matched[1].matchAll(regexpImageName)][0];
    const year = m[1];
    const month = m[2];
    const filename = m[3];
    const extension = m[4];
    await changeImageToWebp(imagesDirectory, year, month, filename, extension);
    body.push(
      `![]({{ "/images/${year}/${month}/${filename}.webp" | prepend: site.baseurl }})`
    );
  }
  body.push(file.substring(end));
  fs.writeFileSync(path.join(postsDirectory, filename), body.join(""));
};

const main = async () => {
  const previousData = await loadPreviousData();
  const postsDirectory = await getDataFromPrompt(
    "postsDirectory",
    "Posts directory",
    previousData.postsDirectory
  );
  if (!postsDirectory) {
    return;
  }
  previousData.postsDirectory = postsDirectory;
  const imagesDirectory = await getDataFromPrompt(
    "imagesDirectory",
    "Images directory",
    previousData.imagesDirectory
  );
  if (!imagesDirectory) {
    return;
  }
  previousData.imagesDirectory = imagesDirectory;
  await savePreviousData(previousData);
  const files = listFiles(postsDirectory);
  for (const file of files) {
    await processFile(postsDirectory, file, imagesDirectory);
  }
};

main()
  .then(() => {
    console.log(`${chalk.blue("info")} Done.`);
  })
  .catch((reason) => {
    console.log(`${chalk.red("error")} ${reason}`);
    console.error(reason);
  });
