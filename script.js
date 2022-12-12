'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {// Parent class for both workout types. This class will take in the data that is common to both workouts.
    date = new Date(); // the date when the workout[object] was created.
    id = (Date.now() + "").slice(-10); // the id of the workout, must be unique, so we can identify it later.

    constructor(coords, distance, duration) { // coords will be an array of coordinates: [lat, lng]
        this.coords = coords; // this.coords=coords that we get as an input from user.
        this.distance = distance; // same here. in km
        this.duration = duration; // same here. in min
    }

    _setDescription() {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on
        ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    }
}

class Running extends Workout {
    type = "running";

    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }

    calcPace() {
        // min/km
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}

class Cycling extends Workout {
    type = "cycling"; // will be available on all instances, this is the same as putting "this.type = "cycling"" in the constructor

    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed() {
        // hm/h
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    }
}

// const run1 = new Running([39, -12], 5.2, 24, 178); // coords, distance, minutes, steps/min
// const cycle1 = new Cycling([39, -12], 27, 95, 523); // coords, distance, minutes, elevation gain
// console.log(run1, cycle1);

///////////////////////////////////////////////////////////////////
// APP ARCHITECTURE
/* Implementing the project architecture
- Implementing the app class [see "Mapty-architecture-part-1.png"] */
class App {
    #map; // private instance property - is gonna be present on all instances created by this class
    #mapZoomLVL = 13; // private instance property - is gonna be present on all instances created by this class
    #mapEvent; // private instance property - is gonna be present on all instances created by this class
    #workouts = [];

    constructor() /* constructor method is called immediately when a new object is created
    from the App class. The constructor is also executed immediately as the page loads.
    The constructor simply gets the current position[this._getPosition();] and then it adds the two
    EventListeners to the "form" and "inputType" element: */ {
        // Get users position:
        this._getPosition(); // "this" means current object

        // Get data from local storage:
        this._getLocalStorage();

        // Attach event handlers
        form.addEventListener("submit", this._newWorkout.bind(this));//this._newWorkout is event handler function .. we use .bind so that the "this" keyword points to the App object, because without the .bind, "this" points to the form. In most of these methods we want the "this" keyword to point to the object itself - in this case the App object which in this case the "this" in bind() is..
        inputType.addEventListener("change", this._toggleElevationField);
        containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));
    }

    _getPosition() { // current position should be determined in this method
        /* DISPLAYING A MAP USING LEAFLET LIBRARY: */
        if (navigator.geolocation)
            navigator.geolocation.getCurrentPosition(
                this._loadMap.bind(this), /* <-- JS will call this callback & pass the "position" argument
                in "_loadMap" as soon as the current position of the user is determined. */

                function () {
                    alert("Could not get your location!");
                }
            );
    }

    _loadMap(position) { // this method is called with the current position of the user
        // get the longitude and latitude from the object:
        const { latitude } = position.coords;
        const { longitude } = position.coords;
        console.log(`https://www.google.com/maps/@${latitude},${longitude}`); // my current location

        const coords = [latitude, longitude]; // we get the longitude and latitude from the objects above.

        // This code comes from leaflet, makes a map:
        this.#map = L.map('map').setView(coords, this.#mapZoomLVL);
        /* "map" must be an ID of an element in HTML
        (in our case at the bottom of HTML) .. nr.13 is the zoom level of map. */

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map); // adds a layer to the map

        // handling clicks on map:
        this.#map.on("click", this._showForm.bind(this));/* map.on() method comes from leaflet not JS,
            and map object is also made by leaflet. */

        // rendering marker:
        this.#workouts.forEach(workout => {
            this._renderWorkoutMarker(workout);
        });
    }

    _showForm(mapEv) { // handling clicks on map:
        this.#mapEvent = mapEv;
        form.classList.remove("hidden"); // shows sidebar content when we click on map
        inputDistance.focus();// focuses on the "Distance" input field when we click on map
    }

    // Hide the form and Clear the input fields [setting them to empty string] so they're empty at first:
    _hideForm() {
        // empty input fields:
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = "";
        form.style.display = "none";
        form.classList.add("hidden");
        setTimeout(() => (form.style.display = "grid"), 1000);
    }

    _toggleElevationField() {
        inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
        inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
    }; /* <--  this will change the last input field on map form: if Type=Cycling,
    the field name="Elev Gain" and input value is in meters; if Type=Running,
    the field name="Cadence" and input value is in steps/min; */

    _newWorkout(event) {
        /* creating a function that takes a number of arguments,
        then validates if all of them are numbers or not: */
        const validInputs = (...inputs) =>
            inputs.every(input => Number.isFinite(input)); /* This will loop over the array, then for each item it will check whether the number is finite or not.
        in the end the "every" method will only return true if "Number.isFinite(input)" was true for all elements in array.
        If only one of the values was not finite(result was false for one array element), then "every" will return false,
        and that will then be the return value of the arrow function. */
        const allPositive = (...inputs) => inputs.every(input => input > 0);

        event.preventDefault();

        //Get data from the form:
        const type = inputType.value;
        const distance = +inputDistance.value; // with "+"" we convert it to a number immediately
        const duration = +inputDuration.value; // with "+"" we convert it to a number immediately
        const { lat, lng } = this.#mapEvent.latlng; /* Render the workout on map as a marker,
        a.k.a., display the pop-up marker(the upside down raindrop). */
        let workout; // we put this in here so that it's available later in code for running and cycling

        // If workout is running, create running object:
        if (type === "running") {
            const cadence = +inputCadence.value;

            /*Check if the data is valid:
            if distance or duration or cadence is not a number,
            we want to return immediately, and also create an alert: */
            if (
                // !Number.isFinite(distance) ||
                // !Number.isFinite(duration) ||
                // !Number.isFinite(cadence)
                // We can replace the commented out lines with this:
                !validInputs(distance, duration, cadence) ||
                !allPositive(distance, duration, cadence)/* if all inputs ARE NUMBERS, this will
                become true, but whenever this is false(all inputs are not numbers) OR if there is
                any number that is not positive - it returns the alert.
                So we want to test if all inputs are numbers and the numbers are positive: */
            )
                return alert("Inputs must be positive numbers!");

            workout = new Running([lat, lng], distance, duration, cadence);
        }

        // If workout is cycling, create cycling object:
        if (type === "cycling") {
            const elevation = +inputElevation.value;
            /* Check if the data is valid:
            if distance or duration or elevation is not a number,
            we want to return immediately, and also create an alert: */
            if (
                // same comment as in running "if"
                !validInputs(distance, duration, elevation) ||
                !allPositive(distance, duration)/* <-- if all inputs ARE NUMBERS, this will become true,
                but whenever this is false(all inputs are not numbers) OR if there is any number that
                is not positive - it returns the alert. */
            )
                return alert("Inputs must be positive numbers!");

            workout = new Cycling([lat, lng], distance, duration, elevation);
        }

        // Add new object to workout array:
        this.#workouts.push(workout);

        /* Render the workout on map as marker,
        this creates a pop-up thing[upside down raindrop]: */
        this._renderWorkoutMarker(workout);

        // Render the workout on list on left side of the page:
        this._renderWorkout(workout);

        // Hide the form and Clear the input fields [setting them to empty string] so they're empty at first:
        this._hideForm();

        // Set local storage to all workouts:
        this._setLocalStorage();
    }

    /* Render the workout on map as marker,
    this creates a pop-up thing[upside down raindrop]: */
    _renderWorkoutMarker(workout) {
        L.marker(workout.coords) // because of coords the pop-up thing shows up everywhere you click on map
            .addTo(this.#map) // adds the pop-up thing to the map
            .bindPopup(
                L.popup({
                    maxWidth: 200,
                    minWidth: 100,
                    autoClose: false,
                    closeOnClick: false,
                    className: `${workout.type}-popup`,
                })
            ) // adds the pop-up window to the marker
            .setPopupContent(`${workout.type === "running" ? "🏃🏻" : "🚴🏻"} ${workout.description}`)
            .openPopup(); // opens the pop-up window
    }

    // Render(show) newly created workouts in the sidebar list:
    _renderWorkout(workout) {
        let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${workout.type === "running" ? "🏃🏻" : "🚴🏻"}</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>`;

        if (workout.type === "running")
            html += `
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.pace.toFixed(1)}</span>
                    <span class="workout__unit">min/km</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">👣</span>
                    <span class="workout__value">${workout.cadence}</span>
                    <span class="workout__unit">steps/min</span>
                </div>
            </li>`;

        if (workout.type === "cycling")
            html += `
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.speed.toFixed()}</span>
                    <span class="workout__unit">km/h</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">⛰</span>
                    <span class="workout__value">${workout.elevationGain}</span>
                    <span class="workout__unit">m</span>
                </div>
            </li>`;

            form.insertAdjacentHTML("afterend", html);
    }

    _moveToPopup(event) {// whenever we click on a workout in sidebar, it goes to that workout on map
        const workoutElement = event.target.closest(".workout");
        console.log(workoutElement);

        if (!workoutElement) return;

        const workout = this.#workouts.find(workoutt => workoutt.id === workoutElement.dataset.id);

        this.#map.setView(workout.coords, this.#mapZoomLVL, { // whenever we click on a workout in sidebar, it goes to that workout on map
            animate: true,
            pan: {
                duration: 1,
            },
        });
    }
        _setLocalStorage() { // don't use localStorage to store large amounts of data - it'll slow down your app!
            localStorage.setItem('workouts', JSON.stringify(this.#workouts));
        }

        _getLocalStorage() { // this will be executed at the beginning so the workouts array will always be empty, but...
        // ...if we already had some data in the local storage, we'll simply set that workouts array to the data that we had before.
            const data = JSON.parse(localStorage.getItem('workouts'));

            if (!data) return;

            this.#workouts = data; // workouts should be equal to data we just read.

            // Let's now take all the workouts and render them into a list:
            this.#workouts.forEach(workout => {
                this._renderWorkout(workout);
            });
        }

        reset() {
            localStorage.removeItem('workouts');
            location.reload();
        }
    };

const app = new App(); // this object is created in the beggining(in the constructor) when the page loads