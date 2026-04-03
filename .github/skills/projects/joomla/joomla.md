---
name: joomla
description: Best practices and constraints for secure Joomla development respecting MVC and APIs.
---

# joomla.md

## 1. Goal

Define rules and best practices for **templates, overrides, components, and content management** in Joomla for this project.

This file ensures:

* the agent respects CMS architecture
* dangerous database manipulation is avoided
* article/menu/content creation flow is respected
* security, SEO, and ACL remain intact

---

## 2. Mandatory principles

* Joomla is **the system core**; all PHP code and interactions must respect MVC.
* Template overrides must follow the standard structure:

  ```plaintext id="ov1"
  /templates/custom/
    html/
      com_content/
        article/
          default.php
  ```

* Changes must be **minimal and documented** in separate Markdown notes.
* Do not modify Joomla core.
* Do not alter render flow outside official override mechanisms.

---

## 3. PHP and API usage

### 3.1 Data reads

* Use Joomla APIs with namespaces (`Factory`, `Table`)
* Avoid direct SQL when a Joomla API exists
* Sanitize results
* Correct example:

```php id="pjc23"
use Joomla\CMS\Factory;

$db = Factory::getContainer()->get('DatabaseDriver');
$query = $db->getQuery(true)
            ->select('*')
            ->from($db->quoteName('#__content'))
            ->where($db->quoteName('state') . ' = 1');
$db->setQuery($query);
$articles = $db->loadObjectList();
```

### 3.2 Content insertion

* Prioritize Joomla API for creating articles, menus, and menu items
* Use SQL only when API path is not viable
* Validate all fields before insertion

---

### 3.3 Content deletion

* Do not use SQL DELETE except critical emergency cases
* Use Joomla backend trash flow
* Note: direct SQL deletion does not use trash and can break relations

---

## 4. Overrides and templates

* Follow required folder structure
* Avoid unnecessary mixing of PHP, HTML, and JS
* Keep BEM in CSS
* Do not copy/paste Joomla core files
* Document changes in separate Markdown notes

---

## 5. Custom components

* Must follow MVC
* Avoid global logic
* Avoid direct DB calls when API exists
* Do not use unapproved external dependencies
* Do not manipulate Joomla core directly

---

## 6. Forms and PDFs

* Forms must validate on both server and client
* Use JForm for complex structures
* PDF generation must run through controlled components
* Do not embed global JS logic inside PHP files

---

## 7. ACL and multilingual

* Apply ACL according to Joomla standards
* For multilingual support, use `JText::_()` and multilingual fields
* Do not bypass ACL
* Do not hardcode language values

---

## 8. SEO

Baseline requirements:

* Use friendly URLs
* Set article metatags automatically where applicable
* Use basic schema when available
* Do not duplicate content
* Do not ignore titles and descriptions

---

## 9. Anti-patterns

* Unnecessary direct SQL
* Mixing PHP/JS logic without structure
* Modifying Joomla core
* Code without minimum documentation

---

## 10. Correct examples

### 10.1 Article override

```php id="ov2"
defined('_JEXEC') or die;

echo '<h1 class="article__title">' . $this->item->title . '</h1>';
```

### 10.2 Article creation with API

```php id="ov3"
use Joomla\CMS\Table\Table;

$article = Table::getInstance('Content');
$article->bind([
  'title' => 'Nuevo artículo',
  'state' => 1,
]);
$article->check();
$article->store();
```

---

## 11. Expected agent behavior

* Follow strict rules
* Use APIs first
* Avoid improvisation
* Keep consistency with `.github/skills/core/frontend-javascript.md` and `.github/skills/core/architecture.md`
* Document critical changes

---

## 12. Final rule

If an action:

* breaks MVC
* breaks security
* breaks consistency
* ignores ACL

it is forbidden, even if it works technically.
