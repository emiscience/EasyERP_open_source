/**
 * Created by German on 30.06.2015.
 */
define([
    'Backbone',
    'jQuery',
    'Underscore',
    'text!templates/Attendance/index.html',
    'models/AttendanceModel',
    'views/Attendance/MonthView',
    'views/Attendance/StatisticsView',
    'populate',
    'moment',
    'dataService',
    'views/selectView/selectView',
    'constants'// added view for employees dd list
], function (Backbone, $, _, mainTemplate, AttendanceModel, MonthView, StatisticsView, populate, moment, dataService, selectView, CONSTANTS) {
    var View = Backbone.View.extend({
        el: '#content-holder',

        template: _.template(mainTemplate),

        events: {
            "click .editable"                                  : "showNewSelect",  // changed dropdown list
            'change #currentStatus'                            : 'changeStatus',
            'change #currentTime'                              : 'changeTime',
            "click .newSelectList li:not(.miniStylePagination)": "changeEmployee",  // changed to click for selectView dd
            "click"                                            : "removeInputs"
        },

        removeInputs: function () {

            if (this.selectView) {
                this.selectView.remove();
            }
        },

        initialize: function () {
            var self = this;
            var employees;
            var status;
            var years;

            this.currentEmployee = null;
            this.currentStatus = null;
            this.currentTime = null;

            this.model = new AttendanceModel();
            this.listenTo(this.model, 'change:currentEmployee', this.changeEmployee);
            //this.listenTo(this.model, 'change:currentStatus', this.changeStatus);
            //this.listenTo(this.model, 'change:currentTime', this.changeTime);

            dataService.getData(CONSTANTS.URLS.EMPLOYEES_PERSONSFORDD, {}, function (result) {
                var yearToday = moment().year();
                employees = result;
                employees = _.map(employees.data, function (employee) {
                    employee.name = employee.name.first + ' ' + employee.name.last;

                    return employee
                });   // changed for getting proper form of names

                self.model.set({
                    employees: employees
                });

                status = self.model.get('status');
                years = self.model.get('years');
                self.currentEmployee = employees[0];
                self.currentStatus = status[0];
                self.currentTime = years[0];

                while (years.indexOf(yearToday) === -1) {
                    years.push(years[years.length - 1] + 1);
                }

                self.render();

                self.model.set({
                    currentEmployee: self.currentEmployee,
                    currentStatus  : self.currentStatus,
                    currentTime    : self.currentTime,
                    years          : years
                });

            });
        },



        showNewSelect: function (e, prev, next) {
            //populate.showSelect(e, prev, next, this);

            var $target = $(e.target);
            e.stopPropagation();
            if ($target.attr('id') === 'selectInput') {
                return false;
            }

            if (this.selectView) {
                this.selectView.remove();
            }

            this.selectView = new selectView({
                e          : e,
                responseObj: {'#employee' : this.model.get("employees")}
            });

            $target.append(this.selectView.render().el);

            return false;
        },

        changeEmployee: function (e) {
            var startTime = new Date();
            var self = this;
            var labels;
            var month;
            var data;
            var keys;

            var target = $(e.target);
            var targetElement = target.closest(".editable").find('span');

            targetElement.text(target.text());

            this.currentEmployee = target.attr("id");  // changed for getting value from selectView dd

            if (!self.currentEmployee) {
                self.currentEmployee = self.model.get('employees')[0].id;
            }

            dataService.getData("/vacation/attendance", {
                year    : self.currentTime,
                employee: self.currentEmployee
            }, function (result) {
                labels = self.model.get('labelMonth');
                month = new MonthView();

                data = _.groupBy(result.data, "year");
                keys = Object.keys(data);

                keys.forEach(function (key) {
                    data[key] = _.groupBy(data[key], 'month');
                });

                self.$el.append(month.render({
                    labels    : labels,
                    year      : self.currentTime,
                    attendance: data,
                    statistic : result.stat,
                    startTime : startTime
                }));
            });
        },

        /*changeStatus: function () {
            var self = this;
            self.currentStatus = this.$el.find("#currentStatus option:selected").attr('id');

            dataService.getData(CONSTANTS.URLS.EMPLOYEES_PERSONSFORDD, {}, function (result) {
                //ToDo Hired and Not Hired
            });
        },*/

        changeTime: function () {
            var startTime = new Date();
            var self = this;
            var labels;
            var month;
            var data;
            var keys;

            self.currentTime = this.$el.find("#currentTime option:selected").text().trim();

            if (!self.currentTime) {
                self.currentTime = self.model.get('years')[0].id;
            }

            dataService.getData("/vacation/attendance", {
                year    : self.currentTime,
                employee: self.currentEmployee
            }, function (result) {
                labels = self.model.get('labelMonth');
                month = new MonthView();

                data = _.groupBy(result.data, "year");
                keys = Object.keys(data);

                keys.forEach(function (key) {
                    data[key] = _.groupBy(data[key], 'month');
                });

                self.$el.append(month.render({
                    labels    : labels,
                    year      : self.currentTime,
                    attendance: data,
                    statistic : result.stat,
                    startTime : startTime
                }));
            });
        },

        render: function () {
            var self = this;

            this.$el.html(this.template(self.model.toJSON()));

            this.rendered = true;

            return this;
        }

    });

    return View;
});