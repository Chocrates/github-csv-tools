// const csv = require("csv");
const fs = require("fs");
const converter = require("json-2-csv");
const ObjectsToCsv = require('objects-to-csv')

// Gets a single comment
const getComment = async (octokit, values, issueNumber) => {
  return new Promise((resolve, reject) => {
    const issueOptions = octokit.issues.listComments.endpoint.merge({
      owner: values.userOrOrganization,
      repo: values.repo,
      issue_number: issueNumber,
    });
    octokit.paginate(issueOptions).then(
      (commentsData) => {
        resolve(commentsData);
      },
      (err) => {
        console.error(err);
        reject(err);
      }
    );
  });
};

// Given the full list of issues, returns back an array of all comments,
// each with the issue data also included.
const getFullCommentData = async (octokit, values, data) => {
  const fullComments = [];
  for (let i = 0; i < data.length; i++) {
    const issueObject = data[i];
      const commentsData = await getComment(octokit, values, issueObject.number);
      let comments = commentsData.map(comment => {
          return `${comment.created_at};${comment.user.login};${comment.body}`
          /*return {
            user: comment.user.login,
            created_at: comment.created_at,
            updated_at: comment.updated_at,
            body: comment.body
          }*/
      })
      for(let i = 0; i < comments.length; i++){
          issueObject[`comment${i}`] = comments[i]

      }
      fullComments.push({
          issue: issueObject
      });
  }
  return fullComments;
};

const twoPadNumber = (number) => {
  return String(number).padStart(2, "0");
};

const exportIssues = (octokit, values, includeComments = false) => {
  // Getting all the issues:
  const options = octokit.issues.listForRepo.endpoint.merge({
    owner: values.userOrOrganization,
    repo: values.repo,
    state: "all",
  });
  octokit.paginate(options).then(
    async (data) => {
      // Customized columns:
      data.forEach(async (issueObject) => {
        if (issueObject.user) {
          issueObject.user = issueObject.user.login;
        }
        if (issueObject.assignee) {
          issueObject.assignee = issueObject.assignee.login;
        }
        if (issueObject.labels) {
          issueObject.labels = issueObject.labels
            .map((labelObject) => {
              return labelObject.name;
            })
            .join(",");
        }
        if (issueObject.assignees) {
          issueObject.assignees = issueObject.assignees
            .map((assigneeObject) => {
              return assigneeObject.login;
            })
            .join(",");
        }
      });

      // Data from the API that we're removing:
      const defaultColumns = values.exportAttributes || [
        "number",
        "title",
        "labels",
        "state",
        "assignees",
        "milestone",
        "created_at",
        "updated_at",
        "closed_at",
        "body",
      ];
        const filteredData = data.filter(issueObject => {
            if(!('pull_request' in issueObject)){
                return issueObject
            }
        }).map((issueObject) => {
            const tempObject = {};
            defaultColumns.forEach((propertyName) => {
                tempObject[propertyName] = issueObject[propertyName];
            });
            return tempObject;
      });

      let csvData = filteredData;
      if (values.exportComments === true) {
        // If we want comments, replace the data that will get pushed into
        // the CSV with our full comments data:
          csvData = await getFullCommentData(octokit, values, filteredData);
      }

        const mappedData = csvData.map( (value) => {
            const tmp = {}
            defaultColumns.forEach((property) => {
                tmp[property] = value.issue[property]
            })

            // find the comments
            Object.keys(value.issue).filter(x => !defaultColumns.includes(x)).forEach((property) => {
                if(property.startsWith('comment')){
                   tmp[property] = value.issue[property] 
                }
            })
            return tmp
        })

        const csv = new ObjectsToCsv(mappedData)

        let csvString = await csv.toString()
        debugger
        csvString = csvString.replace(/^.*/, m => {
            return m.replace(/comment[0-9]+/g, 'comment')
        })
        debugger
        fs.writeFile(values.exportFileName, csvString, 'utf8', err => {
            if (err) {
                console.error("error writing csv!");
                process.exit(0);
            } else {
                console.log(`Success! check ${values.exportFileName}`);
                console.log(
                    "❤ ❗ If this project has provided you value, please ⭐ star the repo to show your support: ➡ https://github.com/gavinr/github-csv-tools"
                );
            }
        })
        //await csv.toDisk('objectstocsv.csv')
        /*converter.json2csv(csvData, (err, csvString) => {
        if (err) {
          console.error("error converting!");
          process.exit(0);
        }

        // console.log("csvString:", csvString);
        const now = new Date();
        let fileName = `${now.getFullYear()}-${twoPadNumber(
          now.getMonth() + 1
        )}-${twoPadNumber(now.getDate())}-${twoPadNumber(
          now.getHours()
        )}-${twoPadNumber(now.getMinutes())}-${twoPadNumber(
          now.getSeconds()
        )}-issues.csv`;
        if (values.exportFileName) {
          fileName = values.exportFileName;
        }
        fs.writeFile(fileName, csvString, "utf8", function (err) {
          if (err) {
            console.error("error writing csv!");
            process.exit(0);
          } else {
            console.log(`Success! check ${fileName}`);
            console.log(
              "❤ ❗ If this project has provided you value, please ⭐ star the repo to show your support: ➡ https://github.com/gavinr/github-csv-tools"
            );
            process.exit(0);
          }
        });
      });*/
    },
    (err) => {
      console.log("error", err);
      process.exit(0);
    }
  );
};
const hackCommentsTogether = (csvString) => {
    const rows = csvString.split('\n')
    const header_columns = rows[0].split(',')
    let comments_column = 0
    for(comments_column; comments_column < header_columns.length; comments_column++){
        if(header_columns[comments_column] === 'comments'){
            break;
        }
    }

    for(let i = 1; i < rows.length; i++){
        let columns = rows[i].split(',')
        let comment_string = columns[comments_column]
    }
    return csvString
}
module.exports = { exportIssues };
