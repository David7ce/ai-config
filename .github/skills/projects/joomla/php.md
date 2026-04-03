---
name: php
description: PHP standards for Joomla focused on internal APIs, security, and data consistency.
---

# php.md

## 1. Goal

Define PHP development rules for Joomla and this project, ensuring:

* correct API usage
* security
* JS/JSON compatibility
* data integrity

---

## 2. Mandatory principles

* Use PHP for Joomla backend concerns
* Integrate with JS through safe JSON or controlled inline payloads
* Validate all inputs
* Sanitize/escape outputs
* Do not modify Joomla core
* Do not bypass MVC
* Do not use unnecessary direct SQL

---

## 3. Joomla interaction

* Create articles, menus, and menu items using Joomla APIs
* Implement backend operations using modern Joomla APIs (`Table`, `Factory`)
* Avoid direct queries when API methods exist
* Validate data integrity before storing

---

## 4. Security

* Escape outputs
* Validate forms
* Prevent XSS and CSRF
* Sanitize JSON data before sending to JS
* Do not use raw `$_GET`/`$_POST` without sanitization

---

## 5. Anti-patterns

* Mixing JS/HTML/PHP logic without structure
* Unnecessary direct SQL
* Uncontrolled JSON file manipulation from PHP
* Global variables

---

## 6. Correct examples

### 6.1 Safe article creation

```php id="php1"
use Joomla\CMS\Table\Table;

$article = Table::getInstance('Content');
$article->bind([
     'title' => 'Safe title',
     'state' => 1,
]);
$article->check();
$article->store();
```

### 6.2 Safe JSON generation for JS

```php id="php2"
$data = json_decode(file_get_contents(JPATH_ROOT . '/data/file.json'), true);
echo '<script type="application/json" id="data-json">'
     . json_encode($data, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT)
     . '</script>';
```
