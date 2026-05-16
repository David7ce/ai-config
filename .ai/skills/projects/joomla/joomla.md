---
name: joomla
description: Best practices and constraints for secure Joomla development respecting MVC and APIs.
---

# joomla.md

## 1. Goal

Define rules and best practices for templates, overrides, components, and content management in Joomla for this project.

---

## 2. Mandatory principles

* Joomla is the system core; all PHP code and interactions must respect MVC.
* Template overrides must follow the standard structure:

  ```plaintext
  /templates/custom/
    html/
      com_content/
        article/
          default.php
  ```

* Changes must be minimal and documented in separate Markdown notes.
* Do not modify Joomla core.
* Do not alter render flow outside official override mechanisms.

---

## 3. PHP and API usage

### 3.1 Data reads

```php
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

* Prioritize Joomla API; use SQL only when API path is not viable
* Validate all fields before insertion

### 3.3 Content deletion

* Do not use SQL DELETE except critical emergency cases
* Use Joomla backend trash flow

---

## 4. ACL and multilingual

* Apply ACL according to Joomla standards
* Use `JText::_()` and multilingual fields
* Do not bypass ACL or hardcode language values

---

## 5. SEO

* Use friendly URLs
* Set article metatags automatically where applicable
* Do not duplicate content or ignore titles and descriptions

---

## 6. Correct examples

```php
defined('_JEXEC') or die;
echo '<h1 class="article__title">' . $this->item->title . '</h1>';
```

```php
use Joomla\CMS\Table\Table;

$article = Table::getInstance('Content');
$article->bind(['title' => 'New article', 'state' => 1]);
$article->check();
$article->store();
```

---

## 7. Final rule

If an action breaks MVC, security, consistency, or ignores ACL — it is forbidden, even if it works technically.
