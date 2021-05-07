
0.6.13 / 2021-05-07
==================

  * Fix: Reject promise correctly for monky._doList(...)
  * Mandatory node v8.12 now

0.6.12 / 2018-10-29
==================

  * Supports an array of subdocuments with references

0.6.11 / 2017-08-29
==================

  * Fixed handling arrays of monky refs #40

0.6.10 / 2016-06-21 
==================

 * Fix initialization in case of nested objects

0.6.9 / 2016-05-31 
==================

 * Replace value using array index fixes #37

0.6.8 / 2015-10-12 
==================

 * Reset sequences when resetting factories as well

0.6.7 / 2015-06-03 
==================

 * Don't validate on build, refs #32
 * Clean up, use lodash instead of old array helper

0.6.6 / 2014-12-15 
==================

 * Fixed global leak; refs #30

0.6.5 / 2014-12-01 
==================

 * Fix monky.create with an array of monky references, refs #29

0.6.4 / 2014-12-01 
==================

 * Allow arrays of monky references, refs #29

0.6.3 / 2014-11-13 
==================

 * Fix object handling, refs #28

0.6.2 / 2014-11-05 
==================

 * Don't use pass by reference to create new model instance, refs #27

0.6.1 / 2014-11-03 
==================

 * Fix initialization in case of mixed path

0.6.0 / 2014-10-22 
==================

 * Added support for promises, refs #19

0.5.1 / 2014-10-22 
==================

 * Fixed passing an ObjectID, refs #20
 * Fix setting null values, refs #20
 * Merge pull request #23 from johanneswuerbach/failing-tests
 * Added test for passing a reference to create, refs #20
 * Fix regression in 0.5.0 related to direct object references, refs #20

0.5.0 / 2014-10-21 
==================

 * Replace sequence in nested objects, closed #18
 * Fix a problem that callback isn't called if options empty

0.4.2 / 2014-07-17 
==================

 * Advanced reference implementation

0.4.1 / 2014-07-15 
==================

 * Added support for String arrays in factories

0.4.0 / 2014-04-30 
==================

 * Allow named factories

0.3.1 / 2014-01-22 
==================

 * Added ability to pass custom values to 'buildList' and 'createList'

0.3.0 / 2014-01-22 
==================

 * Fixed creation of related documents

0.2.2 / 2014-01-22 
==================

 * Updated dependencies
 * Multiple fixes and better tests (false positives)

0.2.1 / 2014-01-12 
==================

 * Fix to not replace this.factories[model] reference when using custom values.

0.2.0 / 2014-01-11 
==================

 * Support for custom values on build/create methods.

0.1.1 / 2014-01-02 
==================

 * Added ability to reset a certain factory

0.1.0 / 2013-12-09 
==================

 * Added ability to define references

0.0.5 / 2013-05-29 
==================

  * Updated github url

0.0.4 / 2013-04-24 
==================

  * Added buildList() and createList() methods

0.0.3 / 2012-12-20 
==================

  * Added support for embedded documents

0.0.2 / 2012-12-20 
==================

  * Made mongoose internal object

0.0.1 / 2012-12-06
==================

  * Initial release
