# სახელების რედაქტირება

ეს გვერდი მათთვისაა, ვინც ფრინველის ქართულ ან ინგლისურ სახელს ასწორებს. კოდი არ გჭირდებათ. ფოტო, ვიკიპედიის ბმული და eBird უკვე სხვა ფაილშია და თქვენ არ გიწევთ მათი შევსება.

შეცვალეთ მხოლოდ [`data/names.json`](data/names.json).

## რა ჩანს ერთ ფრინველზე

ფაილი იწყება `{`-ით და `"birds": [`-ით და მთავრდება `]`-ით და `}`-ით. ამ სათაურებს ნუ წაშლით. თითო ფრინველი ასე გამოიყურება:

```json
{
  "id": "circaetus-gallicus",
  "latin": "Circaetus gallicus",
  "georgian": "გველიჭამია (ან ძერაბოტი)",
  "english": "Short-toed Snake-Eagle"
}
```

შეცვალეთ მხოლოდ `georgian` და `english`, ანუ ბრჭყალებში ჩასმული სახელი.

`id` და `latin` დატოვეთ უცვლელად. ისინი იმისთვისაა, რომ სწორი ფრინველი იპოვოთ. `id` არის მუდმივი კოდი. `latin` არის სამეცნიერო სახელი.

არ გახსნათ `data/birds.json` და არც `data/sources/`. იქ ფოტოები, აღწერები და ბმულებია. სახელი, რომელიც მხოლოდ იმ ფაილში ჩაასწორეთ, საიტის გამოქვეყნებისას ისევ `names.json`-ის სახელით შეიცვლება.

ფრჩხილებში ჩასმული ტექსტი მეორე ქართული სახელია. საიტი მას ცალკე სახელად აჩვენებს და ძებნაშიც იყენებს. თუ მეორე სახელი სწორია, დატოვეთ. მაგალითად `გველიჭამია (ან ძერაბოტი)` ნიშნავს მთავარ სახელს „გველიჭამია“ და მეორე სახელს „ძერაბოტი“.

ქართული სახელი, რომელიც უკვე წერია, ცარიელი ნუ დატოვოთ. წაშლილი სახელი არ მიიღება. ინგლისური სახელიც ცარიელი ნუ დატოვოთ.

## როგორ შეცვალოთ სახელი GitHub-ზე

1. შედით GitHub-ში იმ ანგარიშით, რომელსაც ამ პროექტზე წვდომა მოგცეს. ფანქარი მხოლოდ მაშინ ჩანს, თუ ანგარიშს ჩაწერის უფლება აქვს.
2. გახსენით რეპოზიტორი `Elvenmagic/georgian-bird-names`.
3. გახსენით ფაილი `data/names.json`.
4. დააჭირეთ ფანქარს (Edit this file).
5. ბრაუზერში დააჭირეთ Ctrl+F (Mac-ზე Command+F) და მოძებნეთ ლათინური ან ინგლისური სახელი, მაგალითად `Circaetus gallicus` ან `Short-toed Snake-Eagle`.
6. შეცვალეთ მხოლოდ `georgian` ან `english` ბრჭყალებში. მძიმეები, ბრჭყალები და ფიგურული ფრჩხილები დატოვეთ ისე, როგორც არის.
7. ქვემოთ, Commit changes-ში, მოკლედ დაწერეთ რა შეცვალეთ. მაგალითად: `გველიჭამია → გველიჭამია არწივი`.
8. აირჩიეთ **Create a new branch for this commit and start a pull request**. **Commit directly to the main branch** ნუ აირჩევთ.
9. დააჭირეთ **Propose changes**, შემდეგ **Create pull request**.
10. დაელოდეთ ადამიანს, რომელსაც შერწყმის უფლება აქვს. მან უნდა დაადასტუროს ცვლილება. თქვენ თვითონ ვერ გამოაქვეყნებთ საიტს.
11. შერწყმის შემდეგ საიტი თავისით განახლდება. ამას ერთი-ორი წუთი სჭირდება.

საიტზე სახელი შერწყმამდე არ შეიცვლება.

## თუ შემოწმება გაწითლდა

Pull request-ზე ჩანს წითელი ჯვარი, სახელად **Validate birds.json**. გახსენით ის და წაიკითხეთ პირველი წითელი სტრიქონი. იქ ეწერება, რომელი ფრინველი გასწორდეს.

შემდეგ იმავე branch-იდან კიდევ ერთხელ გახსენით `data/names.json`, დააჭირეთ ფანქარს, გაასწორეთ და ისევ შეინახეთ **იმავე branch-ზე**. შემოწმება თავიდან გაეშვება.

ყველაზე ხშირი მიზეზი ზედმეტი ან ნაკლული მძიმეა.

სწორია: წინა ფრინველის `}`-ის შემდეგ არის მძიმე, ბოლო ფრინველის `}`-ის შემდეგ მძიმე არ არის.

```json
{
  "birds": [
    {
      "id": "circaetus-gallicus",
      "latin": "Circaetus gallicus",
      "georgian": "გველიჭამია (ან ძერაბოტი)",
      "english": "Short-toed Snake-Eagle"
    },
    {
      "id": "falco-columbarius",
      "latin": "Falco columbarius",
      "georgian": "ალალი",
      "english": "Merlin"
    }
  ]
}
```

არასწორია ბოლო `}`-ის შემდეგ დარჩენილი მძიმე, ან ორ ფრინველს შორის დაკარგული მძიმე. არასწორია აგრეთვე შეცვლილი `id` ან `latin`: დააბრუნეთ ძველი მნიშვნელობა. ახალი ფრინველი ამ ფაილში ნუ დაამატებთ და არსებულს ნუ წაშლით. ახალ სახეობას ამატებს ის, ვინც სიას განაახლებს.

---

# Editing names

This page is for people who correct a bird’s Georgian or English name. You do not need to write code. Photos, Wikipedia links, and eBird codes already live in another file, and you do not fill them in.

Edit only [`data/names.json`](data/names.json).

## What one bird looks like

The file starts with `{` and `"birds": [` and ends with `]` and `}`. Leave that wrapper in place. Each bird looks like this:

```json
{
  "id": "circaetus-gallicus",
  "latin": "Circaetus gallicus",
  "georgian": "გველიჭამია (ან ძერაბოტი)",
  "english": "Short-toed Snake-Eagle"
}
```

Change only the quoted text of `georgian` and `english`.

Leave `id` and `latin` unchanged. They are how you find the right bird. `id` is a permanent code. `latin` is the scientific name.

Do not open `data/birds.json` or `data/sources/`. Those hold photos, descriptions, and links. A name corrected only in `birds.json` is replaced by the `names.json` name when the site is published.

Text in parentheses is another Georgian name. The site shows it and searches it. Keep a second name when it is right. `გველიჭამია (ან ძერაბოტი)` means the main name „გველიჭამია“ and the other name „ძერაბოტი“.

Do not leave a Georgian name empty when one is already there. A deleted name is rejected. Do not leave the English name empty either.

## Change a name on GitHub

1. Sign in to GitHub with the account that was given access. The pencil is visible only when that account can write to the project.
2. Open the repository `Elvenmagic/georgian-bird-names`.
3. Open `data/names.json`.
4. Click the pencil (Edit this file).
5. Press Ctrl+F in the browser (Command+F on a Mac) and search for the Latin or English name, for example `Circaetus gallicus` or `Short-toed Snake-Eagle`.
6. Change only the quoted `georgian` or `english` text. Leave commas, quotes, and brackets as they are.
7. In Commit changes, write a short note about what you changed. For example: `გველიჭამია → გველიჭამია არწივი`.
8. Choose **Create a new branch for this commit and start a pull request**. Do not choose **Commit directly to the main branch**.
9. Click **Propose changes**, then **Create pull request**.
10. Wait for someone who is allowed to merge. They have to approve the change. You cannot publish the site yourself.
11. After the merge, the site updates on its own. That takes a minute or two.

The live site does not change before the merge.

## If the check turns red

The pull request shows a red cross named **Validate birds.json**. Open it and read the first red line. It names the bird to fix.

Then, from that same branch, open `data/names.json` again, click the pencil, fix the file, and save onto **the same branch**. The check runs again.

The usual mistake is an extra comma or a missing comma.

This shape is valid: a comma after the `}` of every bird except the last one.

```json
{
  "birds": [
    {
      "id": "circaetus-gallicus",
      "latin": "Circaetus gallicus",
      "georgian": "გველიჭამია (ან ძერაბოტი)",
      "english": "Short-toed Snake-Eagle"
    },
    {
      "id": "falco-columbarius",
      "latin": "Falco columbarius",
      "georgian": "ალალი",
      "english": "Merlin"
    }
  ]
}
```

A comma after the last `}` is invalid, and so is a missing comma between two birds. A changed `id` or `latin` is also invalid: put the old value back. Do not add a new bird here and do not delete one. New species are added by the person who refreshes the checklist.
